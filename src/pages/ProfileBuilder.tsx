import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import {
  Check, Copy, Sparkles, ChevronRight, Eye, Upload, X, Image as ImageIcon, BarChart3, Loader2, Lock, TrendingUp, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { linkedinSections } from "@/lib/data";
import { getProfile } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyTaskComplete } from "@/lib/notifyTask";
import LinkedInAnalysis from "@/components/LinkedInAnalysis";
import LinkedInGrow from "@/components/LinkedInGrow";

import { useLinkedInImport } from "@/hooks/useLinkedInImport";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import linkedinLogo from "@/assets/linkedin-logo.png";
import { Seo } from "@/components/Seo";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";

const MAX_CAPTION_LENGTH = 3000;

export default function ProfileBuilder() {
  const profile = getProfile();
  const { linkedinImport } = useLinkedInImport();
  const [searchParams, setSearchParams] = useSearchParams();

  const [liActiveSection, setLiActiveSection] = useState(linkedinSections[0].id);
  const [liInputs, setLiInputs] = useState<Record<string, string>>({});
  const [liOutputs, setLiOutputs] = useState<Record<string, string>>({});
  const [liCopied, setLiCopied] = useState<string | null>(null);
  const [liGenerating, setLiGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showGrow, setShowGrow] = useState(false);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useAiGenerationGuard(liGenerating, "LinkedIn generation");

  // Legacy ?import=1 query param now redirects to centralized connectors page
  useEffect(() => {
    if (searchParams.get("import") === "1") {
      searchParams.delete("import");
      setSearchParams(searchParams, { replace: true });
      window.location.href = "/profile?section=connectors";
    }
  }, [searchParams, setSearchParams]);

  // Persist LinkedIn builder draft across refresh / navigation
  useDraftPersistence(
    "profile-builder",
    { liActiveSection, liInputs, liOutputs },
    (saved) => {
      if (saved.liActiveSection) setLiActiveSection(saved.liActiveSection);
      if (saved.liInputs) setLiInputs(saved.liInputs);
      if (saved.liOutputs) setLiOutputs(saved.liOutputs);
    },
  );

  const liCompleted = Object.keys(liOutputs).filter((k) => liOutputs[k]).length;
  const liProgress = (liCompleted / linkedinSections.length) * 100;

  const handleGenerate = async (sectionId: string, input: string) => {
    if (!input.trim()) return;
    setLiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-text", {
        body: { section: sectionId, input, language: localStorage.getItem("pf_language") || "en" },
      });
      if (error) {
        if (error.message?.includes("429")) toast.error("Rate limit exceeded. Please wait.");
        else if (error.message?.includes("402")) toast.error("API credits exhausted.");
        else toast.error("Failed to refine text. Please try again.");
        return;
      }
      if (data?.refined) {
        setLiOutputs((p) => ({ ...p, [sectionId]: data.refined }));
        notifyCreditConsumed();
        toast.success("Text refined successfully!");
        void notifyTaskComplete({
          title: "Profile section refined",
          message: "Your AI-rewritten copy is ready in the Profile Builder.",
          showToast: false,
        });
      } else if (data?.error) toast.error(data.error);
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLiGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setLiCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setLiCopied(null), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPostImage(ev.target?.result as string); setPostImageFile(file); };
    reader.readAsDataURL(file);
  };
  const removeImage = () => { setPostImage(null); setPostImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleNavigateToSection = (sectionId: string) => { setShowAnalysis(false); setShowPreview(false); setLiActiveSection(sectionId); };

  return (
    <div className="py-8 sm:py-12">
      <Seo title='Profile builder — LinkedIn & application | Pathforge' description='Build a polished student LinkedIn and application profile from your real activities and accomplishments.' path='/profile-builder' />
      <div className="section-container max-w-6xl">
        <ScrollReveal>
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <img src={linkedinLogo} alt="LinkedIn" className="h-8 w-8 rounded-sm" />
              LinkedIn Builder
            </h1>
            <p className="mt-2 text-muted-foreground">
              Build a polished, professional LinkedIn profile section by section.
            </p>
            {profile && (
              <p className="mt-1 text-sm">
                Targeting <span className="font-medium text-accent">{profile.targetCollege}</span>
              </p>
            )}
          </div>
          {!linkedinImport && (
            <Button asChild variant="outline" className="flex-shrink-0">
              <a href="/profile?section=connectors">
                <img src={linkedinLogo} alt="" className="mr-2 h-4 w-4 rounded-sm" />
                Import LinkedIn in Settings
              </a>
            </Button>
          )}
        </div>
        </ScrollReveal>

        <div className="space-y-6">
          <ScrollReveal delay={0.06} className="card-elevated p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground">LinkedIn Progress</h3>
              <span className="text-sm text-muted-foreground">{liCompleted} of {linkedinSections.length} sections</span>
            </div>
            <Progress value={liProgress} className="h-2" />
          </ScrollReveal>
          <AiGenerationNotice active={liGenerating} />

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="card-elevated p-4 sticky top-24">
                <h3 className="font-medium text-foreground mb-4">Sections</h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setShowAnalysis(true); setShowPreview(false); setShowGrow(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${showAnalysis ? "bg-accent/10 text-accent" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Analyze Profile</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showAnalysis ? "rotate-90" : ""}`} />
                  </button>
                  <button
                    onClick={() => {
                      if (!linkedinImport) { window.location.href = "/profile?section=connectors"; return; }
                      setShowGrow(true); setShowAnalysis(false); setShowPreview(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${showGrow ? "bg-accent/10 text-accent" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    <span className="flex items-center gap-2">
                      {linkedinImport ? <TrendingUp className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      Grow
                      {!linkedinImport && <span className="text-[10px] uppercase tracking-wide ml-1 text-muted-foreground">Locked</span>}
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showGrow ? "rotate-90" : ""}`} />
                  </button>
                  <div className="border-t border-border my-2" />
                  {linkedinSections.map((section) => {
                    const isActive = liActiveSection === section.id && !showAnalysis && !showPreview && !showGrow;
                    const isComplete = !!liOutputs[section.id];
                    return (
                      <button key={section.id} onClick={() => { setLiActiveSection(section.id); setShowAnalysis(false); setShowPreview(false); setShowGrow(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${isActive ? "bg-accent/10 text-accent" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                        <span className="flex items-center gap-2">{isComplete && <Check className="h-4 w-4 text-green-500" />}{section.title}</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? "rotate-90" : ""}`} />
                      </button>
                    );
                  })}
                </nav>
                <div className="mt-6 pt-4 border-t border-border">
                  <Button variant="outline" className="w-full" onClick={() => { setShowPreview(!showPreview); setShowAnalysis(false); setShowGrow(false); }}>
                    <Eye className="mr-2 h-4 w-4" />{showPreview ? "Hide Preview" : "Preview All"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {showGrow && <LinkedInGrow />}
              {showAnalysis && !showGrow && <LinkedInAnalysis onNavigateToSection={handleNavigateToSection} />}

              {!showAnalysis && !showPreview && !showGrow && (
                <>
                  {liActiveSection === "posts" && (
                    <div className="card-elevated p-6">
                      <h2 className="text-xl font-semibold text-foreground mb-2">{linkedinSections.find(s => s.id === "posts")!.title}</h2>
                      <p className="text-muted-foreground mb-6">{linkedinSections.find(s => s.id === "posts")!.description}</p>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground mb-2">Upload Image (Optional)</label>
                        {postImage ? (
                          <div className="relative inline-block">
                            <img src={postImage} alt="Post preview" className="max-w-full max-h-64 rounded-lg border border-border" />
                            <button onClick={removeImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 transition-all">
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground text-sm">Click to upload</p>
                          </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </div>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-foreground">Your informal caption</label>
                          <span className={`text-xs ${(liInputs["posts"]?.length || 0) > MAX_CAPTION_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>{liInputs["posts"]?.length || 0} / {MAX_CAPTION_LENGTH}</span>
                        </div>
                        <Textarea placeholder={linkedinSections.find(s => s.id === "posts")!.placeholder} value={liInputs["posts"] || ""} onChange={(e) => setLiInputs(p => ({ ...p, posts: e.target.value }))} className="min-h-[120px] resize-y" />
                      </div>
                      <Button onClick={() => handleGenerate("posts", liInputs["posts"] || "")} disabled={!liInputs["posts"]?.trim() || liGenerating} className="btn-accent mb-6">
                        {liGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refining...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Post</>}
                      </Button>
                      {liGenerating && <AiGenerationNotice active className="mb-6" />}
                      {liOutputs["posts"] && (
                        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-foreground flex items-center gap-2"><UserRound className="h-4 w-4 text-accent" />Professional Post</h4>
                            <Button variant="outline" size="sm" onClick={() => handleCopy(liOutputs["posts"], "posts")}>
                              {liCopied === "posts" ? <><Check className="h-4 w-4 mr-1" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                            </Button>
                          </div>
                          {postImage && <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3"><ImageIcon className="h-5 w-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Image: {postImageFile?.name}</span></div>}
                          <div className="prose prose-sm text-foreground whitespace-pre-wrap">{liOutputs["posts"]}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {linkedinSections.filter(s => s.id !== "posts").map((section) => (
                    <motion.div key={section.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: liActiveSection === section.id ? 1 : 0, x: liActiveSection === section.id ? 0 : 20, display: liActiveSection === section.id ? "block" : "none" }} transition={{ duration: 0.2 }}>
                      <div className="card-elevated p-6">
                        <h2 className="text-xl font-semibold text-foreground mb-2">{section.title}</h2>
                        <p className="text-muted-foreground mb-6">{section.description}</p>
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-foreground mb-2">Your informal input</label>
                          <Textarea placeholder={section.placeholder} value={liInputs[section.id] || ""} onChange={(e) => setLiInputs(p => ({ ...p, [section.id]: e.target.value }))} className="min-h-[120px] resize-y" />
                        </div>
                        <Button onClick={() => handleGenerate(section.id, liInputs[section.id] || "")} disabled={!liInputs[section.id]?.trim() || liGenerating} className="btn-accent mb-6">
                          {liGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refining...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate {section.title}</>}
                        </Button>
                        {liGenerating && <AiGenerationNotice active className="mb-6" />}
                        {liOutputs[section.id] && (
                          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-foreground flex items-center gap-2"><UserRound className="h-4 w-4 text-accent" />Professional Output</h4>
                              <Button variant="outline" size="sm" onClick={() => handleCopy(liOutputs[section.id], section.id)}>
                                {liCopied === section.id ? <><Check className="h-4 w-4 mr-1" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                              </Button>
                            </div>
                            <div className="prose prose-sm text-foreground whitespace-pre-wrap">{liOutputs[section.id]}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </>
              )}

              {showPreview && !showAnalysis && (
                <div className="card-elevated p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2"><Eye className="h-5 w-5 text-accent" />Full Profile Preview</h2>
                  <div className="space-y-8">
                    {linkedinSections.map((section) => (
                      <div key={section.id} className="border-b border-border pb-6 last:border-0">
                        <h3 className="font-medium text-foreground mb-2">{section.title}</h3>
                        {liOutputs[section.id] ? (
                          <>
                            {section.id === "posts" && postImage && <img src={postImage} alt="Post" className="max-w-xs rounded-lg mb-3" />}
                            <div className="prose prose-sm text-muted-foreground whitespace-pre-wrap">{liOutputs[section.id]}</div>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleCopy(liOutputs[section.id], section.id)}>
                              {liCopied === section.id ? <><Check className="h-4 w-4 mr-1" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                            </Button>
                          </>
                        ) : <p className="text-sm text-muted-foreground italic">Not completed yet</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
