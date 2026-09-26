import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type AdvisorArtifact, getArtifactSignedUrl } from "@/hooks/useAdvisorArtifacts";
import { KIND_META } from "@/components/advisor/ArtifactsPanel";
import { markdownCodeComponents } from "@/components/advisor/CodeBlock";
import { cn } from "@/lib/utils";

/**
 * The artifact, previewed in the conversation.
 *
 * WHAT THIS REPLACES
 *
 * A card with the artifact's title, its kind, and — for anything that was not
 * an image — up to 220 characters of markdown with its syntax stripped out.
 * That is a filename with a subtitle. A student who had just asked for a
 * six-slide deck saw four headings joined by middots and had to open a side
 * panel to find out whether the thing was any good, which is the one question
 * they had. The panel could already render all of this properly; the
 * conversation could not, and the conversation is where the work happens.
 *
 * So each kind is previewed as the thing it actually is:
 *
 *  - **PDF** — the file itself, in an iframe. Every browser this app supports
 *    renders PDFs natively, so this is the real first page rather than a
 *    re-render of the markdown it was built from. `#toolbar=0` because a
 *    viewer chrome inside a chat bubble is three rows of controls for a
 *    preview you cannot act on.
 *  - **Slides** — a real slide, with its heading and bullets, and arrows to
 *    step through the deck. `content_json` is not a description of the pptx,
 *    it is what the pptx was generated from, so this is the deck.
 *  - **Documents and plans** — rendered markdown, with the same components the
 *    panel uses, clamped and faded at the bottom edge.
 *  - **Spreadsheets** — the first rows of the actual table, read from the same
 *    arrays the .xlsx was written from.
 *  - **Charts** — the generated SVG, never cropped: `object-cover` on a
 *    photograph loses some scenery, on a bar chart it loses the axis.
 *  - **Images** are unchanged: they already rendered, and they are handled by
 *    InlineGeneratedImage in most cases anyway.
 *
 * The whole card remains one button onto the full panel. Everything inside it
 * that is interactive — the slide arrows, the PDF frame — stops the click, so
 * stepping through a deck does not throw the panel open on top of it.
 */
export function ArtifactInlineCard({
  artifact,
  onOpen,
}: {
  artifact: AdvisorArtifact;
  onOpen: () => void;
}) {
  const meta = KIND_META[artifact.kind];
  const Icon = meta.icon;

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const slides = useMemo<{ heading: string; bullets: string[] }[]>(() => {
    const raw = artifact.content_json?.slides;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s: Record<string, unknown>) => ({
        heading: typeof s?.heading === "string" ? s.heading : "",
        bullets: Array.isArray(s?.bullets)
          ? (s.bullets as unknown[]).filter((b): b is string => typeof b === "string").slice(0, 6)
          : [],
      }))
      .filter((s) => s.heading || s.bullets.length);
  }, [artifact.content_json]);

  const [slideIndex, setSlideIndex] = useState(0);

  const sheet = useMemo<{ columns: string[]; rows: string[][] } | null>(() => {
    const columns = artifact.content_json?.columns;
    const rows = artifact.content_json?.rows;
    if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows)) return null;
    return {
      columns: columns.map((c: unknown) => String(c ?? "")),
      rows: (rows as unknown[])
        .slice(0, 6)
        .map((r) => (Array.isArray(r) ? r.map((c: unknown) => String(c ?? "")) : [])),
    };
  }, [artifact.content_json]);

  // A signed URL is only worth fetching for the kinds that render the file.
  // A .docx has no in-browser renderer, so asking for its URL here would be a
  // round trip spent on a link the card never uses.
  const wantsFile =
    !!artifact.file_path &&
    (artifact.kind === "image" ||
      artifact.kind === "chart" ||
      artifact.kind === "pdf" ||
      artifact.file_mime === "application/pdf");

  useEffect(() => {
    let cancelled = false;
    if (!wantsFile) return;
    setFileLoading(true);
    getArtifactSignedUrl(artifact).then((u) => {
      if (cancelled) return;
      setFileUrl(u);
      setFileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [artifact, wantsFile]);

  const isPdf = artifact.kind === "pdf" || artifact.file_mime === "application/pdf";
  // A chart is an SVG file, so it renders exactly like an image — but it is a
  // separate kind because the footer, the icon and the panel all treat it as
  // one, and because a chart is regenerated from content_json while a
  // generated image cannot be.
  const isPicture = artifact.kind === "image" || artifact.kind === "chart";
  const hasSlides = slides.length > 0;
  const hasMarkdown = !!artifact.content_markdown?.trim();

  return (
    <div className="mt-2 w-full max-w-md overflow-hidden rounded-xl border border-border bg-card/80">
      {/* ── The preview ─────────────────────────────────────────────── */}
      {isPicture && artifact.file_path ? (
        fileLoading ? (
          <Waiting />
        ) : fileUrl ? (
          <img
            src={fileUrl}
            alt={artifact.title}
            decoding="async"
            className={cn(
              "w-full",
              // A chart is never cropped. `object-cover` on a photograph loses
              // some scenery; on a bar chart it loses the axis, and a chart
              // with its scale cut off is worse than no chart.
              artifact.kind === "chart" ? "bg-white object-contain" : "max-h-72 object-cover",
            )}
          />
        ) : null
      ) : isPdf && artifact.file_path ? (
        fileLoading ? (
          <Waiting />
        ) : fileUrl ? (
          <div
            className="relative h-64 bg-muted"
            // The frame swallows pointer events for scrolling and selection,
            // so the card's own open-on-click cannot fire from inside it. The
            // button below the preview is the way in.
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&view=FitH`}
              title={artifact.title}
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
        ) : (
          <Unavailable />
        )
      ) : sheet ? (
        <SheetPreview columns={sheet.columns} rows={sheet.rows} />
      ) : hasSlides ? (
        <SlidePreview
          slides={slides}
          index={Math.min(slideIndex, slides.length - 1)}
          onIndex={setSlideIndex}
        />
      ) : hasMarkdown ? (
        // Clamped rather than scrolled: a scroll area nested inside the
        // conversation's own scroll area traps the wheel, and the card is a
        // preview — the panel is where you read the whole thing.
        <div className="relative max-h-44 overflow-hidden px-4 pt-3.5">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-0 prose-headings:text-[15px] prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 text-[13px] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownCodeComponents}>
              {artifact.content_markdown as string}
            </ReactMarkdown>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </div>
      ) : null}

      {/* ── The footer, which is the affordance ─────────────────────── */}
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted", meta.tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{artifact.title}</span>
          <span className="block text-xs text-muted-foreground">
            {meta.label}
            {hasSlides ? ` · ${slides.length} slide${slides.length === 1 ? "" : "s"}` : ""}
            {sheet ? ` · ${sheet.columns.length} column${sheet.columns.length === 1 ? "" : "s"}` : ""}
          </span>
        </span>
        <Maximize2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The first few rows of the workbook.
 *
 * Read from `content_json`, which the generator wrote from the same arrays it
 * built the .xlsx from — so this is the sheet, not a description of it, and
 * it needs no download and no parser to show. Six rows: enough to see the shape
 * and the first few entries, which is what "did it understand me" needs.
 */
function SheetPreview({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="max-h-52 overflow-hidden border-b border-border">
      <table className="w-full table-fixed border-collapse text-[12px]">
        <thead>
          <tr className="bg-muted/60">
            {columns.slice(0, 4).map((c) => (
              <th
                key={c}
                className="truncate px-2.5 py-1.5 text-left font-semibold text-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              {columns.slice(0, 4).map((_, ci) => (
                <td key={ci} className="truncate px-2.5 py-1.5 text-muted-foreground">
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Waiting() {
  return (
    <div className="flex h-32 items-center justify-center bg-muted text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}

function Unavailable() {
  return (
    <div className="flex h-24 items-center justify-center bg-muted px-4 text-center text-xs text-muted-foreground">
      Preview unavailable — open it to download.
    </div>
  );
}

/**
 * One slide of the deck, with its own stepper.
 *
 * Proportioned 16:9 and set in the display face, so it reads as a slide rather
 * than as a bulleted list that happens to be in a box. Bullets are capped at
 * six by the parser: a slide with eleven bullets is a slide with a problem,
 * and truncating it in the preview is not where that gets fixed.
 */
function SlidePreview({
  slides,
  index,
  onIndex,
}: {
  slides: { heading: string; bullets: string[] }[];
  index: number;
  onIndex: (i: number) => void;
}) {
  const slide = slides[index];
  const step = (delta: number) => onIndex((index + delta + slides.length) % slides.length);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div className="aspect-[16/9] w-full border-b border-border bg-background px-5 py-4">
        <p className="font-display text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          {slide.heading}
        </p>
        {slide.bullets.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-snug text-muted-foreground">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                <span className="line-clamp-2">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 pb-1.5">
          <StepButton label="Previous slide" onClick={() => step(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </StepButton>
          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {index + 1} / {slides.length}
          </span>
          <StepButton label="Next slide" onClick={() => step(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </StepButton>
        </div>
      )}
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-6 w-6 place-items-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
