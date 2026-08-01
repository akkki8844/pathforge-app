import { X, FileText, Image as ImageIcon, FileAudio, FileSpreadsheet, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Attachment = {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: "image" | "pdf" | "doc" | "sheet" | "audio" | "text" | "other";
  status: "uploading" | "processing" | "ready" | "error";
  storagePath?: string;
  summary?: string;
  extractedText?: string;
  dataUrl?: string; // for image preview / multimodal
  error?: string;
};

const ICON: Record<Attachment["kind"], any> = {
  image: ImageIcon,
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  audio: FileAudio,
  text: FileText,
  other: File,
};

export function AttachmentChips({
  items,
  onRemove,
}: {
  items: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {items.map((a) => {
        const Icon = ICON[a.kind];
        const busy = a.status === "uploading" || a.status === "processing";
        return (
          <div
            key={a.id}
            className={cn(
              "group relative flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs max-w-[220px]",
              a.status === "error" && "border-destructive/50 bg-destructive/5"
            )}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-medium" title={a.name}>{a.name}</span>
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              className="ml-1 rounded p-0.5 hover:bg-muted"
              aria-label={`Remove ${a.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
