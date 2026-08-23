import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { type AdvisorArtifact, getArtifactSignedUrl } from "@/hooks/useAdvisorArtifacts";
import { KIND_META } from "@/components/advisor/ArtifactsPanel";
import { cn } from "@/lib/utils";

/** Flatten markdown to a short plain-text teaser for the card. */
function excerpt(md: string, max = 220): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")        // fenced code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")  // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")     // headings
    .replace(/^\s{0,3}[-*+]\s+/gm, "")      // bullets
    .replace(/[*_`>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// Compact preview card rendered inline in the chat, right under the message
// that created the artifact — so the user sees a glimpse without having to
// open the side panel. Tapping it opens the full ArtifactsPanel on this item.
export function ArtifactInlineCard({ artifact, onOpen }: { artifact: AdvisorArtifact; onOpen: () => void }) {
  const meta = KIND_META[artifact.kind];
  const Icon = meta.icon;
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);

  // Slide decks carry content_json rather than markdown, so they had no card
  // preview at all. The headings are the deck's outline — the useful glimpse.
  const slideHeadings = useMemo<string[]>(() => {
    const slides = artifact.content_json?.slides;
    if (!Array.isArray(slides)) return [];
    return slides
      .map((s: any) => (typeof s?.heading === "string" ? s.heading : ""))
      .filter(Boolean)
      .slice(0, 4);
  }, [artifact.content_json]);

  useEffect(() => {
    let cancelled = false;
    if (artifact.kind !== "image" || !artifact.file_path) return;
    setThumbLoading(true);
    getArtifactSignedUrl(artifact).then((u) => {
      if (cancelled) return;
      setThumbUrl(u);
      setThumbLoading(false);
    });
    return () => { cancelled = true; };
  }, [artifact]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 block w-full max-w-sm text-left rounded-xl border border-border bg-card/80 hover:border-accent/40 hover:bg-secondary/40 transition-colors overflow-hidden"
    >
      {artifact.kind === "image" && artifact.file_path ? (
        thumbLoading ? (
          <div className="flex h-28 items-center justify-center bg-muted text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : thumbUrl ? (
          <img src={thumbUrl} alt={artifact.title} className="h-28 w-full object-cover" decoding="async" />
        ) : null
      ) : artifact.content_markdown ? (
        // Plain text rather than rendered markdown: at 64px tall a heading or a
        // code fence blows the excerpt out to one or two words. Stripping the
        // syntax fits three or four readable lines instead.
        <div className="px-3 pt-3 max-h-16 overflow-hidden text-xs leading-relaxed text-muted-foreground">
          {excerpt(artifact.content_markdown)}
        </div>
      ) : slideHeadings.length > 0 ? (
        <div className="px-3 pt-3 max-h-16 overflow-hidden text-xs leading-relaxed text-muted-foreground">
          {slideHeadings.join(" · ")}
        </div>
      ) : null}
      <div className="flex items-center gap-2 p-3">
        <div className={cn("h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center", meta.tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{artifact.title}</div>
          <div className="text-xs text-muted-foreground">{meta.label} · Tap to preview</div>
        </div>
      </div>
    </button>
  );
}
