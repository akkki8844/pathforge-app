import { useState, useRef, useEffect } from "react";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Linkedin, Check, Copy, Sparkles, ChevronRight, Eye, Upload, X, Image as ImageIcon, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { linkedinSections } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LinkedInAnalysis from "@/components/LinkedInAnalysis";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";

import { useLinkedInImport } from "@/hooks/useLinkedInImport";

const MAX_CAPTION_LENGTH = 3000;

export default function LinkedInPage() {
  const [activeSection, setActiveSection] = useState(linkedinSections[0].id);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  useAiGenerationGuard(isGenerating, "LinkedIn generation");
  
  const { linkedinImport } = useLinkedInImport();

  // Posts-specific state
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist all section inputs/outputs so refresh / navigation never wipes work
  useDraftPersistence(
    "linkedin",
    { activeSection, inputs, outputs },
    (saved) => {
      if (saved.activeSection) setActiveSection(saved.activeSection);
      if (saved.inputs) setInputs(saved.inputs);
      if (saved.outputs) setOutputs(saved.outputs);
    },
  );

  // Prefill inputs from imported LinkedIn (profile_extracted_data) so each
  // section starts with the user's real content — honors, certifications,
  // internships, education, etc. User edits override the prefill.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profile_extracted_data")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data?.data) return;
      const d: any = data.data;
      const join = (arr: any[], fn: (x: any) => string) =>
        (arr || []).map(fn).filter(Boolean).join("\n");
      const prefill: Record<string, string> = {
        headline: d.headline || "",
        about: d.about || "",
        experience: join(d.experiences, (e) =>
          `${e.title || ""}${e.organization ? " — " + e.organization : ""}${e.description ? ": " + e.description : ""}`),
        internships: join(
          (d.experiences || []).filter((e: any) =>
            /intern|research|lab|shadow|fellow/i.test(`${e.title} ${e.description || ""}`)),
          (e) => `${e.title}${e.organization ? " — " + e.organization : ""}${e.start || e.end ? ` (${e.start || ""}${e.end ? "–" + e.end : ""})` : ""}${e.description ? ": " + e.description : ""}`),
        projects: join(d.projects, (p) =>
          `${p.title || ""}${p.outcome ? " — " + p.outcome : p.description ? ": " + p.description : ""}`),
        education: join(d.education, (e) =>
          `${e.school || ""}${e.degree ? " — " + e.degree : ""}${e.field ? ", " + e.field : ""}${e.grade ? ` (${e.grade})` : ""}`),
        honors: join(d.awards, (a) =>
          `${a.title || ""}${a.issuer ? " — " + a.issuer : ""}${a.date ? ` (${a.date})` : ""}`),
        certifications: join(d.certifications, (c) =>
          `${c.name || ""}${c.issuer ? " — " + c.issuer : ""}${c.date ? ` (${c.date})` : ""}`),
        skills: (d.skills || []).join(", "),
      };
      setInputs((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(prefill)) {
          if (v && !next[k]?.trim()) next[k] = v;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [linkedinImport?.updated_at]);

  const completedSections = Object.keys(outputs).filter((key) => outputs[key]).length;
  const progress = (completedSections / linkedinSections.length) * 100;

  const handleGenerate = async (sectionId: string) => {
    if (!inputs[sectionId]?.trim()) return;
    
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('refine-text', {
        body: { 
          section: sectionId, 
          input: inputs[sectionId],
          language: localStorage.getItem("pf_language") || "en",
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (error.message?.includes('402') || error.message?.includes('credits')) {
          toast.error("API credits exhausted. Please add credits to continue.");
        } else {
          toast.error("Failed to refine text. Please try again.");
        }
        return;
      }

      if (data?.refined) {
        setOutputs((prev) => ({ ...prev, [sectionId]: data.refined }));
        notifyCreditConsumed();
        toast.success("Content refined successfully!");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error('Generate error:', err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (sectionId: string) => {
    navigator.clipboard.writeText(outputs[sectionId]);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPostImage(event.target?.result as string);
        setPostImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPostImage(null);
    setPostImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleNavigateToSection = (sectionId: string) => {
    setShowAnalysis(false);
    setShowPreview(false);
    setActiveSection(sectionId);
  };

  const renderPostsSection = () => {
    const section = linkedinSections.find((s) => s.id === "posts")!;
    const captionLength = inputs["posts"]?.length || 0;
    
    return (
      <div className="card-elevated p-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {section.title}
        </h2>
        <p className="text-muted-foreground mb-6">
          {section.description}
        </p>

        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Upload Certificate or Achievement Image (Optional)
          </label>
          
          {postImage ? (
            <div className="relative inline-block">
              <img 
                src={postImage} 
                alt="Post preview" 
                className="max-w-full max-h-64 rounded-lg border border-border"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Click to upload an image
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                PNG, JPG up to 5MB
              </p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Caption Input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">
              Your informal caption
            </label>
            <span className={`text-xs ${captionLength > MAX_CAPTION_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
              {captionLength} / {MAX_CAPTION_LENGTH}
            </span>
          </div>
          <Textarea
            placeholder={section.placeholder}
            value={inputs["posts"] || ""}
            onChange={(e) => setInputs((prev) => ({ ...prev, posts: e.target.value }))}
            className="min-h-[120px] resize-y"
          />
          {captionLength > MAX_CAPTION_LENGTH && (
            <p className="text-xs text-destructive mt-1">Caption exceeds LinkedIn's character limit</p>
          )}
        </div>

        <Button
          onClick={() => handleGenerate("posts")}
          disabled={!inputs["posts"]?.trim() || isGenerating || captionLength > MAX_CAPTION_LENGTH}
          className="btn-accent mb-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refining with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Professional Post
            </>
          )}
        </Button>
        {isGenerating && <AiGenerationNotice active className="mb-6" />}

        {/* Output */}
        <AnimatePresence>
          {outputs["posts"] && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="p-4 rounded-lg bg-accent/5 border border-accent/20"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-accent" />
                  Professional Post Ready
                </h4>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy("posts")}
                  >
                    <AnimatePresence mode="wait">
                      {copiedSection === "posts" ? (
                        <motion.span
                          key="copied"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Copied
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </div>
            
            {postImage && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Image attached: {postImageFile?.name}
                </span>
              </div>
            )}
            
            <div className="prose prose-sm text-foreground whitespace-pre-wrap">
              {outputs["posts"]}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
              Copy this text and post it on LinkedIn along with your uploaded image.
            </p>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="py-8 sm:py-12">
      <div className="section-container">
        {/* Header */}
        <ScrollReveal>
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Linkedin className="h-8 w-8 text-accent" />
              LinkedIn Profile Builder
            </h1>
            <p className="mt-2 text-muted-foreground">
              Build a professional LinkedIn profile section by section.
            </p>
          </div>
          {!linkedinImport && (
            <Button asChild variant="outline" className="gap-2">
              <a href="/profile?section=connectors">
                <Upload className="h-4 w-4" />
                Import LinkedIn in Settings
              </a>
            </Button>
          )}
        </div>
        </ScrollReveal>

        {/* Progress */}
        <ScrollReveal delay={0.06} className="card-elevated p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground">Your Progress</h3>
            <span className="text-sm text-muted-foreground">
              {completedSections} of {linkedinSections.length} sections completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </ScrollReveal>
          <AiGenerationNotice active={isGenerating} className="mb-8" />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Section Navigation */}
          <div className="lg:col-span-1">
            <motion.div
              className="card-elevated p-4 sticky top-24"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="font-medium text-foreground mb-4">Sections</h3>
              <nav className="space-y-1">
                {/* Analyze Profile Button */}
                <motion.button
                  onClick={() => {
                    setShowAnalysis(true);
                    setShowPreview(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                    showAnalysis
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analyze Profile
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAnalysis ? "rotate-90" : ""}`} />
                </motion.button>

                <div className="border-t border-border my-2" />

                {linkedinSections.map((section, i) => {
                  const isActive = activeSection === section.id && !showAnalysis && !showPreview;
                  const isComplete = !!outputs[section.id];

                  return (
                    <motion.button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        setShowAnalysis(false);
                        setShowPreview(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex items-center gap-2">
                        <AnimatePresence>
                          {isComplete && (
                            <motion.div
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {section.title}
                      </span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? "rotate-90" : ""}`} />
                    </motion.button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowPreview(!showPreview);
                    setShowAnalysis(false);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {showPreview ? "Hide Preview" : "Preview All"}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Analysis View */}
            {showAnalysis && (
              <LinkedInAnalysis onNavigateToSection={handleNavigateToSection} />
            )}

            {/* Builder View */}
            {!showAnalysis && !showPreview && (
              <>
                {/* Render Posts section specially */}
                {activeSection === "posts" && renderPostsSection()}
                
                {/* Render other sections */}
                {linkedinSections.filter(s => s.id !== "posts").map((section) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ 
                      opacity: activeSection === section.id ? 1 : 0,
                      x: activeSection === section.id ? 0 : 20,
                      display: activeSection === section.id ? "block" : "none"
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="card-elevated p-6">
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        {section.title}
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        {section.description}
                      </p>

                      {/* Input */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Your informal input
                        </label>
                        <Textarea
                          placeholder={section.placeholder}
                          value={inputs[section.id] || ""}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [section.id]: e.target.value }))}
                          className="min-h-[120px] resize-y"
                        />
                      </div>

                      <Button
                        onClick={() => handleGenerate(section.id)}
                        disabled={!inputs[section.id]?.trim() || isGenerating}
                        className="btn-accent mb-6"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refining with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Professional {section.title}
                          </>
                        )}
                      </Button>
                      {isGenerating && <AiGenerationNotice active className="mb-6" />}

                      {/* Output */}
                      {outputs[section.id] && (
                        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-foreground flex items-center gap-2">
                              <Linkedin className="h-4 w-4 text-accent" />
                              Professional Output
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(section.id)}
                            >
                              {copiedSection === section.id ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="prose prose-sm text-foreground whitespace-pre-wrap">
                            {outputs[section.id]}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* Preview View */}
            {showPreview && !showAnalysis && (
              <div className="card-elevated p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-accent" />
                  Full Profile Preview
                </h2>
                
                <div className="space-y-8">
                  {linkedinSections.map((section) => (
                    <div key={section.id} className="border-b border-border pb-6 last:border-0">
                      <h3 className="font-medium text-foreground mb-2">{section.title}</h3>
                      {outputs[section.id] ? (
                        <>
                          {section.id === "posts" && postImage && (
                            <img 
                              src={postImage} 
                              alt="Post attachment" 
                              className="max-w-xs rounded-lg mb-3"
                            />
                          )}
                          <div className="prose prose-sm text-muted-foreground whitespace-pre-wrap">
                            {outputs[section.id]}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleCopy(section.id)}
                          >
                            {copiedSection === section.id ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Not completed yet
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
