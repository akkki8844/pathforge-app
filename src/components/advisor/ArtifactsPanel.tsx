import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, FileImage, Presentation, ListChecks, Download, Trash2, ArrowLeft, Copy, Check, ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type AdvisorArtifact } from "@/hooks/useAdvisorArtifacts";
import { markdownCodeComponents } from "@/components/advisor/CodeBlock";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const KIND_META: Record<string, { icon: any; label: string; tone: string }> = {
  plan:     { icon: ListChecks,   label: "Plan",     tone: "text-emerald-500" },
  document: { icon: FileText,     label: "Document", tone: "text-blue-500" },
  pdf:      { icon: FileImage,    label: "PDF",      tone: "text-rose-500" },
  slides:   { icon: Presentation, label: "Slides",   tone: "text-amber-500" },
  image:    { icon: ImageIcon,    label: "Image",    tone: "text-fuchsia-500" },
};

// Artifacts are passed in rather than re-fetched. Advisor.tsx already holds the
// list for the header badge; calling the hook again here opened a second
// realtime channel and a second query for the same rows, and let the badge and
// the panel disagree mid-flight.
export function ArtifactsPanel({
  open,
  onOpenChange,
  artifacts,
  getDownloadUrl,
  remove,
  focusArtifactId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  artifacts: AdvisorArtifact[];
  getDownloadUrl: (a: AdvisorArtifact) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  focusArtifactId?: string | null;
}) {
  const [active, setActive] = useState<AdvisorArtifact | null>(null);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Jump straight to the artifact the user tapped inline in the chat, once
  // it's loaded into the list.
  useEffect(() => {
    if (!open || !focusArtifactId) return;
    const target = artifacts.find((a) => a.id === focusArtifactId);
    if (target) setActive(target);
  }, [open, focusArtifactId, artifacts]);

  // Resolve a signed preview URL whenever the user opens a file-backed artifact.
  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    if (!active?.file_path) return;
    setPreviewLoading(true);
    getDownloadUrl(active).then((u) => {
      if (cancelled) return;
      setPreviewUrl(u);
      setPreviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [active, getDownloadUrl]);

  const download = async (a: AdvisorArtifact) => {
    if (a.file_path) {
      const url = previewUrl || (await getDownloadUrl(a));
      if (url) window.open(url, "_blank");
      else toast({ variant: "destructive", title: "Download failed" });
    } else if (a.content_markdown) {
      const blob = new Blob([a.content_markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${a.title}.md`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setActive(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            {active && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setActive(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle className="text-base">{active ? active.title : "Artifacts"}</SheetTitle>
          </div>
        </SheetHeader>

        {!active ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {artifacts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Plans, documents, and slide decks the advisor creates will show up here.
                </p>
              )}
              {artifacts.map((a) => {
                const meta = KIND_META[a.kind];
                const Icon = meta.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActive(a)}
                    className="w-full text-left rounded-xl border bg-card p-3 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center", meta.tone)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {meta.label} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-5">
                {/* Order matters: the real file wins over the markdown it was
                    rendered from. PDFs and images now also carry
                    content_markdown, so checking that first — as this used to —
                    would swap a faithful preview for a re-rendered
                    approximation. */}
                {active.kind === "image" && active.file_path ? (
                  previewLoading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={active.title}
                      decoding="async"
                      className="w-full h-auto rounded-lg border bg-muted"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Preview unavailable — use download.</p>
                  )
                ) : active.file_path && (active.file_mime === "application/pdf" || active.kind === "pdf") ? (
                  previewLoading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title={active.title}
                      className="w-full h-[70svh] rounded-lg border bg-card"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Preview unavailable — use download.</p>
                  )
                ) : active.kind === "slides" && active.content_json?.slides ? (
                  <div className="space-y-4">
                    {active.content_json.slides.map((s: any, i: number) => (
                      <div key={i} className="rounded-lg border bg-card p-4">
                        <div className="text-xs text-muted-foreground mb-1">Slide {i + 1}</div>
                        <div className="font-semibold">{s.heading}</div>
                        {s.bullets && (
                          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
                            {s.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : active.content_markdown ? (
                  // Word documents land here: there is no in-browser .docx
                  // renderer, but the markdown they were generated from is the
                  // same content, so the preview is faithful.
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownCodeComponents}>
                      {active.content_markdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This artifact has no inline preview — use download to open it.
                  </p>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-3 flex items-center gap-2">
              <Button size="sm" onClick={() => download(active)} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              {active.file_path && previewUrl && (
                <Button size="sm" variant="outline" onClick={() => window.open(previewUrl, "_blank")} className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </Button>
              )}
              {active.content_markdown && (
                <Button size="sm" variant="outline" onClick={() => copy(active.content_markdown!)} className="gap-2">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
              )}
              <div className="flex-1" />
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={async () => { await remove(active.id); setActive(null); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
