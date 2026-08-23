import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ImageIcon,
  Loader2,
  Maximize2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import {
  TIMETABLE_IMAGE_MAX_BYTES,
  TIMETABLE_IMAGE_TYPES,
  type RoutineTimetableImage,
} from "@/lib/routine/types";

/**
 * The uploaded timetable, shown as the file the student actually uploaded.
 *
 * The rule this component exists to keep: what renders here is the *original
 * image*, at its own aspect ratio, never cropped. A timetable is a dense grid
 * where the corner cells matter as much as the middle, so `object-contain` and
 * a height cap — never `object-cover`, never a redrawn grid standing in for the
 * picture. Where the image is too wide for the viewport it scrolls sideways
 * inside its own box rather than being shrunk until the 9pt room numbers
 * disappear, and the lightbox gives it the full screen with both axes
 * scrollable for a proper look.
 */

const ACCEPT = TIMETABLE_IMAGE_TYPES.join(",");

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Drag-and-drop + click-to-browse target.
 *
 * Both affordances, because a phone has no drag and a lot of people never
 * discover that a dashed box is clickable. It is a real `<button>` wrapping a
 * hidden `<input type="file">`, so it is keyboard-reachable for free.
 */
export function TimetableDropzone({
  onFile,
  uploading,
  compact = false,
  label = "Upload timetable image",
}: {
  onFile: (file: File) => void;
  uploading: boolean;
  compact?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!(TIMETABLE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        toast.error("That file isn't an image", {
          description: "Upload a PNG or JPEG photo or export of your timetable.",
        });
        return;
      }
      if (file.size > TIMETABLE_IMAGE_MAX_BYTES) {
        toast.error("That image is too large", {
          description: `${prettySize(file.size)} — the limit is ${
            TIMETABLE_IMAGE_MAX_BYTES / 1024 / 1024
          }MB.`,
        });
        return;
      }
      onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!uploading) take(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          // Reset so choosing the same file twice in a row still fires.
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 text-center transition-colors",
          compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
          dragging && "border-accent bg-accent/5",
          uploading ? "cursor-wait opacity-70" : "hover:border-accent/60 hover:bg-accent/[0.03]",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-2xl border border-border bg-background",
            compact ? "h-9 w-9" : "h-11 w-11",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          ) : (
            <Upload className="h-5 w-5 text-accent" />
          )}
        </span>
        <span className="font-display text-sm font-bold text-foreground">
          {uploading ? "Uploading…" : label}
        </span>
        {!compact && (
          <span className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Drag a file here or click to browse. PNG or JPEG, up to{" "}
            {TIMETABLE_IMAGE_MAX_BYTES / 1024 / 1024}MB. Your image is stored privately and shown
            exactly as you uploaded it.
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * The image itself, plus the lightbox.
 *
 * `maxHeightClass` is the only thing that differs between the Timetable page
 * (generous) and the dashboard card (compact) — the picture, the fit rule and
 * the click-to-enlarge behaviour are identical, so the dashboard is visibly the
 * same timetable rather than a second rendering of it.
 */
export function TimetableImageView({
  url,
  loading = false,
  maxHeightClass = "max-h-[70vh]",
  className,
  alt = "Your uploaded timetable",
}: {
  url: string | null;
  loading?: boolean;
  maxHeightClass?: string;
  className?: string;
  alt?: string;
}) {
  const [open, setOpen] = useState(false);

  if (loading || !url) {
    return <Skeleton className={cn("w-full rounded-xl", maxHeightClass, "h-48", className)} />;
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        title="Open full size"
        className={cn(
          "group relative block w-full overflow-x-auto rounded-xl border border-border bg-background",
          className,
        )}
      >
        {/*
         * w-auto + max-w-none inside an overflow-x-auto box: a wide timetable
         * keeps its real width and the box scrolls, instead of the image being
         * squeezed to the column width until the text in it is unreadable.
         */}
        <img
          src={url}
          alt={alt}
          className={cn("mx-auto block h-auto w-auto max-w-full object-contain", maxHeightClass)}
        />
        <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-2 py-1 text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="h-3 w-3" />
          Enlarge
        </span>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[96vw] p-2 sm:p-3">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {/* Both axes scroll: on a phone the natural-size image is wider and
              taller than the sheet, and pinching a shrunk-to-fit copy gives
              back no detail that was already thrown away. */}
          <div className="max-h-[85vh] overflow-auto rounded-lg bg-background">
            <img src={url} alt={alt} className="block h-auto w-auto max-w-none" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The Timetable page's image section: the picture, what it is, and the two
 * things you can do to it.
 */
export function TimetableImageCard({
  image,
  url,
  urlLoading,
  uploading,
  removing,
  onUpload,
  onRemove,
}: {
  image: RoutineTimetableImage;
  url: string | null;
  urlLoading: boolean;
  uploading: boolean;
  removing: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-4">
      <TimetableImageView url={url} loading={urlLoading || uploading} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {image.original_name ? `${image.original_name} · ` : ""}
          {prettySize(image.file_size)} · uploaded{" "}
          {new Date(image.uploaded_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>

        <div className="flex items-center gap-2">
          <input
            ref={replaceRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={uploading || removing}
            onClick={() => replaceRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Replace
          </Button>
          {/* Two-step, in place, matching the section's DeleteAction pattern:
              removing the timetable is not something to do by mis-tap. */}
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="destructive"
                size="sm"
                disabled={removing}
                onClick={() => {
                  setConfirming(false);
                  onRemove();
                }}
              >
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove it"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              disabled={uploading || removing}
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <span>
          This is your timetable image, shown exactly as uploaded. Nothing has read the times off
          it, so Today and Calendar can't list these classes individually — add them in the grid
          below if you want them in your daily agenda.
        </span>
      </p>
    </div>
  );
}
