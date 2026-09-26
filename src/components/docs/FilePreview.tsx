import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { documentSignedUrl } from "@/hooks/useDocuments";
import type { DocumentNode } from "@/lib/documents/types";
import { markdownCodeComponents } from "@/components/advisor/CodeBlock";

/**
 * An uploaded file, shown without leaving the drive.
 *
 * WHAT THIS REPLACES
 *
 * Opening a file signed a URL and called `window.open`. That is a download in
 * a new tab: the drive you were browsing is now behind you, the file is in a
 * viewer with none of the surrounding context, and getting back to the folder
 * means finding the original tab again. For the common case — "which of these
 * four report cards is the one from last term" — it is the wrong shape
 * entirely, because the answer is four seconds of looking and then closing it.
 *
 * So the file opens here instead, over the folder it is in, and closing it
 * puts you back exactly where you were. Opening in a tab is still one click
 * away for the cases that want it.
 *
 * WHAT CAN BE SHOWN, AND WHAT CANNOT
 *
 * Only what a browser can render honestly:
 *
 *  - **Images** and **PDFs** render natively, as themselves.
 *  - **Text, markdown, CSV and JSON** are fetched and rendered — markdown as
 *    markdown, everything else as monospaced text. The fetch is capped, since
 *    a 25 MB log is not a preview and the bucket allows files that size.
 *  - **Everything else** — .docx, .pptx, .xlsx, .zip — gets an honest panel
 *    saying so, with download and open-in-tab. There is no in-browser renderer
 *    for those formats, and the alternatives are all worse than admitting it:
 *    a third-party viewer service would mean uploading a student's transcript
 *    to somebody else's server to look at it, and a converted approximation
 *    would show them something that is not their file.
 */

/** Anything larger than this is not previewed as text — it is offered as a download. */
const MAX_TEXT_BYTES = 512 * 1024;

type TextState = { status: "idle" | "loading" | "error"; body?: string };

export function FilePreview({
  node,
  onOpenChange,
}: {
  /** The file to show. `null` closes the dialog. */
  node: DocumentNode | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [text, setText] = useState<TextState>({ status: "idle" });

  const mime = node?.mime_type ?? "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";
  const isMarkdown = mime === "text/markdown" || !!node?.title.toLowerCase().endsWith(".md");
  const isText =
    !isPdf &&
    (mime.startsWith("text/") ||
      mime === "application/json" ||
      mime === "application/xml" ||
      isMarkdown);
  const tooBigForText = (node?.file_size ?? 0) > MAX_TEXT_BYTES;

  // One signed URL per opened file. Every branch needs it — the image renders
  // from it, the PDF frames it, the text branch fetches it, and the two
  // buttons in the footer use it — so it is resolved once here rather than in
  // each of them.
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setText({ status: "idle" });
    if (!node?.file_path) return;
    setUrlLoading(true);
    documentSignedUrl(node).then((u) => {
      if (cancelled) return;
      setUrl(u);
      setUrlLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [node]);

  useEffect(() => {
    let cancelled = false;
    if (!url || !isText || tooBigForText) return;
    setText({ status: "loading" });
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((body) => {
        if (!cancelled) setText({ status: "idle", body: body.slice(0, MAX_TEXT_BYTES) });
      })
      .catch(() => {
        if (!cancelled) setText({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [url, isText, tooBigForText]);

  return (
    <Dialog open={!!node} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(64rem,95vw)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3.5 text-left">
          <DialogTitle className="truncate text-[15px] font-semibold">
            {node?.title ?? "File"}
          </DialogTitle>
          {node && (
            <p className="text-xs text-muted-foreground">
              {describe(node)}
            </p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/30">
          {urlLoading ? (
            <Centered>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Centered>
          ) : !url ? (
            <Centered>
              <p className="text-sm text-muted-foreground">That file could not be opened.</p>
            </Centered>
          ) : isImage ? (
            <div className="flex min-h-full items-center justify-center p-5">
              <img
                src={url}
                alt={node?.title ?? ""}
                className="max-h-full max-w-full rounded-lg object-contain"
                decoding="async"
              />
            </div>
          ) : isPdf ? (
            // Full height rather than a fixed one: a PDF is the only thing here
            // with its own pagination, and cramming it into 400px means
            // scrolling a document inside a scrolling dialog.
            <iframe
              src={`${url}#view=FitH`}
              title={node?.title ?? "PDF"}
              className="h-[70vh] w-full border-0 bg-background"
            />
          ) : isText ? (
            tooBigForText ? (
              <Centered>
                <p className="max-w-sm text-center text-sm text-muted-foreground">
                  This file is too large to preview. Download it to read the whole thing.
                </p>
              </Centered>
            ) : text.status === "loading" ? (
              <Centered>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </Centered>
            ) : text.status === "error" ? (
              <Centered>
                <p className="text-sm text-muted-foreground">That file could not be read.</p>
              </Centered>
            ) : isMarkdown ? (
              <div className="mx-auto max-w-3xl bg-background p-6 sm:p-8">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownCodeComponents}>
                    {text.body ?? ""}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <pre className="min-h-full whitespace-pre-wrap break-words bg-background p-6 font-mono text-[12.5px] leading-relaxed text-foreground">
                {text.body}
              </pre>
            )
          ) : (
            <Centered>
              <div className="max-w-sm text-center">
                <p className="text-sm font-medium text-foreground">
                  No preview for this kind of file
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Browsers cannot render {extensionOf(node?.title) || "this format"} on their own,
                  and sending your file to an outside viewer to render it is not something this
                  app will do. Download it to open it in the app it belongs to.
                </p>
              </div>
            </Centered>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!url}
            onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="ml-1.5">Open in a tab</span>
          </Button>
          <Button size="sm" disabled={!url} asChild={!!url}>
            {url ? (
              <a href={url} download={node?.title}>
                <Download className="h-3.5 w-3.5" />
                <span className="ml-1.5">Download</span>
              </a>
            ) : (
              <span>
                <Download className="h-3.5 w-3.5" />
                <span className="ml-1.5">Download</span>
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[18rem] items-center justify-center p-8">{children}</div>;
}

/** "PDF · 1.2 MB", for the line under the filename. */
function describe(node: DocumentNode): string {
  const parts: string[] = [];
  const ext = extensionOf(node.title);
  if (ext) parts.push(ext);
  if (node.file_size) parts.push(formatBytes(node.file_size));
  return parts.join(" · ");
}

function extensionOf(title?: string | null): string {
  if (!title) return "";
  const dot = title.lastIndexOf(".");
  if (dot <= 0 || dot === title.length - 1) return "";
  return title.slice(dot + 1).toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
