import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FileSignature, Sparkles, Loader2, Check, Copy, ChevronRight, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import {
  applicationSections,
  applicationPlatforms,
  countFor,
  type ApplicationSection,
  type ApplicationPlatform,
} from "@/lib/applicationSections";
import { useLinkedInImport } from "@/hooks/useLinkedInImport";
import { Link } from "react-router-dom";
import linkedinLogo from "@/assets/linkedin-logo.png";
import { Seo } from "@/components/Seo";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";
import { AgentEdit } from "@/components/AgentEdit";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Eyebrow, Panel, Reveal } from "@/components/dashboard/primitives";

/**
 * The visual language matches the dashboard and the landing page: bordered
 * cards, editorial-blue eyebrows, a lift on hover, reveal-on-scroll motion.
 * The one addition beyond "polish this text" is the agent-edit box under
 * every generated draft — a precise, single-instruction editor rather than
 * an open-ended chat, because open-ended chat is exactly where an assistant
 * starts inventing specifics the student never gave it.
 */

interface EntryRow {
  section_id: string;
  input_text: string | null;
  refined_text: string | null;
}

export default function ApplicationBuilder() {
  const { user } = useAuth();
  const { linkedinImport } = useLinkedInImport();
  const reduced = useReducedMotion();
  const [activeId, setActiveId] = useState<string>(applicationSections[0].id);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<string, number>>({});
  useAiGenerationGuard(!!generatingId, "Application generation");

  const active = useMemo<ApplicationSection>(
    () => applicationSections.find((s) => s.id === activeId) ?? applicationSections[0],
    [activeId],
  );

  // Load existing entries
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("application_entries")
        .select("section_id,input_text,refined_text")
        .eq("user_id", user.id);
      if (cancelled) return;
      const ins: Record<string, string> = {};
      const outs: Record<string, string> = {};
      ((data as EntryRow[] | null) ?? []).forEach((row) => {
        if (row.input_text) ins[row.section_id] = row.input_text;
        if (row.refined_text) outs[row.section_id] = row.refined_text;
      });
      setInputs(ins);
      setOutputs(outs);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const persist = (sectionId: string, patch: Partial<EntryRow>) => {
    if (!user) return;
    window.clearTimeout(saveTimers.current[sectionId]);
    saveTimers.current[sectionId] = window.setTimeout(async () => {
      await supabase.from("application_entries").upsert(
        {
          user_id: user.id,
          section_id: sectionId,
          input_text: patch.input_text ?? inputs[sectionId] ?? "",
          refined_text: patch.refined_text ?? outputs[sectionId] ?? null,
        },
        { onConflict: "user_id,section_id" },
      );
    }, 600);
  };

  const onInputChange = (sectionId: string, value: string) => {
    setInputs((p) => ({ ...p, [sectionId]: value }));
    persist(sectionId, { input_text: value });
  };

  const applyOutput = (sectionId: string, revised: string) => {
    setOutputs((p) => ({ ...p, [sectionId]: revised }));
    persist(sectionId, { refined_text: revised });
    toast.success("Applied.");
  };

  const handleGenerate = async (section: ApplicationSection) => {
    const input = (inputs[section.id] || "").trim();
    if (!input) { toast.error("Add a few sentences first."); return; }
    setGeneratingId(section.id);
    try {
      const { data, error } = await supabase.functions.invoke("refine-text", {
        body: { section: section.id, input, language: localStorage.getItem("pf_language") || "en" },
      });
      if (error) {
        if (error.message?.includes("429")) toast.error("Rate limited — try again in a moment.");
        else if (error.message?.includes("402")) toast.error("Daily credit limit reached.");
        else toast.error("Could not refine. Try again.");
        return;
      }
      const refined = (data as { refined?: string; error?: string } | null)?.refined;
      if (refined) {
        setOutputs((p) => ({ ...p, [section.id]: refined }));
        persist(section.id, { refined_text: refined });
        notifyCreditConsumed();
        toast.success("Polished. Ready to paste.");
      } else if ((data as { error?: string } | null)?.error) {
        toast.error((data as { error?: string }).error!);
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const completedCount = applicationSections.filter((s) => outputs[s.id]?.trim()).length;
  const progressPct = (completedCount / applicationSections.length) * 100;

  return (
    <div className="py-8 sm:py-12">
      <Seo title='Application builder — write standout statements | Pathforge' description='Turn your achievements into professional Common App and supplemental statements with AI guidance.' path='/application-builder' />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="mb-6 flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <Eyebrow>Application Builder</Eyebrow>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Every platform, one polished draft
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              Drop rough notes, get an application-ready statement for the Common App, UC App, or any
              supplemental. Drafts auto-save; the agent below can adjust any draft on request.
            </p>
          </div>
          {linkedinImport && (
            <Badge variant="secondary" className="gap-1.5">
              <img src={linkedinLogo} alt="" className="h-3 w-3 rounded-sm" />
              LinkedIn data imported
            </Badge>
          )}
        </motion.header>

        <div className="space-y-4 pb-24">
          <Reveal delay={0.04}>
            <Panel lift={false}>
              <div className="mb-3 flex items-center justify-between">
                <Eyebrow>Progress</Eyebrow>
                <span className="font-serif text-[13px] tabular-nums text-muted-foreground">
                  {completedCount} of {applicationSections.length}
                </span>
              </div>
              <Progress value={progressPct} className="h-2" />
              {!linkedinImport && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Tip:{" "}
                  <Link to="/profile-builder?import=1" className="text-primary underline-offset-2 hover:underline">
                    import your LinkedIn
                  </Link>{" "}
                  to pre-fill activities, honors, and research from your profile.
                </p>
              )}
            </Panel>
          </Reveal>
          <AiGenerationNotice active={!!generatingId} />

          <div className="grid gap-4 lg:grid-cols-3">
            <aside className="lg:col-span-1">
              <div className="card-motion sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-card p-4">
                <Eyebrow>Sections</Eyebrow>
                <p className="mb-4 mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Pick the platform you're applying through. Each section auto-saves.
                </p>
                <nav className="space-y-4">
                  {applicationPlatforms.map((platform) => {
                    const sections = applicationSections.filter((s) => s.platform === platform);
                    if (sections.length === 0) return null;
                    return (
                      <div key={platform}>
                        <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {platform}
                        </div>
                        <div className="space-y-0.5">
                          {sections.map((s) => {
                            const isActive = activeId === s.id && !showPreview;
                            const isComplete = !!outputs[s.id]?.trim();
                            return (
                              <button
                                key={s.id}
                                onClick={() => { setActiveId(s.id); setShowPreview(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  {isComplete && <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                                  <span className="truncate">{s.title}</span>
                                </span>
                                <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </nav>
                <div className="mt-6 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {showPreview ? "Hide preview" : "Preview all"}
                  </Button>
                </div>
              </div>
            </aside>

            <main className="lg:col-span-2">
              {loading ? (
                <Panel lift={false} className="flex items-center justify-center p-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </Panel>
              ) : showPreview ? (
                <Panel lift={false}>
                  <Eyebrow>Full preview</Eyebrow>
                  <div className="mt-4 space-y-8">
                    {applicationSections.map((s) => (
                      <div key={s.id} className="border-b border-border pb-6 last:border-0">
                        <h3 className="font-medium text-foreground mb-2">{s.title}</h3>
                        {outputs[s.id]?.trim() ? (
                          <>
                            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                              {outputs[s.id]}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => handleCopy(outputs[s.id], s.id)}
                            >
                              {copiedId === s.id ? (
                                <><Check className="h-4 w-4 mr-1" /> Copied</>
                              ) : (
                                <><Copy className="h-4 w-4 mr-1" /> Copy</>
                              )}
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Not generated yet</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : (
                <SectionEditor
                  section={active}
                  input={inputs[active.id] || ""}
                  output={outputs[active.id] || ""}
                  onInputChange={(v) => onInputChange(active.id, v)}
                  onGenerate={() => handleGenerate(active)}
                  onCopy={() => handleCopy(outputs[active.id] || "", active.id)}
                  onAgentApplied={(revised) => applyOutput(active.id, revised)}
                  generating={generatingId === active.id}
                  copied={copiedId === active.id}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditorProps {
  section: ApplicationSection;
  input: string;
  output: string;
  onInputChange: (v: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onAgentApplied: (revised: string) => void;
  generating: boolean;
  copied: boolean;
}

function SectionEditor({
  section, input, output, onInputChange, onGenerate, onCopy, onAgentApplied, generating, copied,
}: EditorProps) {
  const count = countFor(input, section.limitKind);
  const limitLabel = section.limitKind === "words" ? "words" : "chars";
  const overLimit = count > section.limit;

  return (
    <motion.div
      key={section.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Panel lift={false}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{section.title}</h2>
          <Badge variant="outline" className="text-[10px]">{section.category}</Badge>
        </div>
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{section.description}</p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Your rough input</label>
            <span className={`text-xs tabular-nums ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {count} / {section.limit} {limitLabel}
            </span>
          </div>
          <Textarea
            placeholder={section.placeholder}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            className="min-h-[160px] resize-y"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground/80 italic">
            Example: {section.placeholder.replace(/^e\.g\.\s*/i, "").replace(/^"|"$/g, "")}
          </p>
        </div>

        <Button
          onClick={onGenerate}
          disabled={!input.trim() || generating}
          className="btn-accent mb-6"
        >
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refining…</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Generate polished {section.title.toLowerCase()}</>
          )}
        </Button>
        {generating && <AiGenerationNotice active className="mb-6" />}

        {output && (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Application-ready output
                </h4>
                <Button variant="outline" size="sm" onClick={onCopy}>
                  {copied ? (<><Check className="h-4 w-4 mr-1" /> Copied</>) : (<><Copy className="h-4 w-4 mr-1" /> Copy</>)}
                </Button>
              </div>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {output}
              </div>
            </div>

            <AgentEdit section={section.id} currentText={output} onApplied={onAgentApplied} />
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
