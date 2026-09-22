/**
 * One document, open for writing.
 *
 * This is a page editor, not a text box: a sheet of a chosen paper size, with
 * margins, page breaks drawn where the paper will actually break, a ribbon of
 * the formatting a document needs, an outline to move around a long one by,
 * and a count of what it adds up to. It prints to the same paper it draws,
 * which is also how it makes a PDF.
 *
 * It replaced a markdown textarea with a preview toggle. That was honest about
 * what it stored and dishonest about what it was for: a student writing a
 * personal statement wants bold, headings and a word count, not to remember
 * that two asterisks mean emphasis and to guess how long the essay runs.
 *
 * What is stored is HTML. Anything written before this — markdown, in the same
 * column — is converted when it is opened and saved back as HTML by the first
 * autosave; see `lib/documents/convert.ts`. Saving is still automatic and
 * debounced, and the status line still says plainly which of the three states
 * it is in, because a student should never have to think about a save button.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Columns3,
  FileDown,
  Loader2,
  Printer,
  Rows3,
  Star,
  Table2,
  Trash2,
  Trash,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useDocuments } from "@/hooks/useDocuments";
import { documentExtensions } from "@/components/docs/editor/extensions";
import {
  Ribbon,
  ZOOM_LEVELS,
  type RibbonTab,
  type ViewState,
} from "@/components/docs/editor/Ribbon";
import { FindBar } from "@/components/docs/editor/FindBar";
import { Ruler } from "@/components/docs/editor/Ruler";
import { InsightsPane, OutlinePane } from "@/components/docs/editor/panels";
import {
  download,
  htmlToMarkdown,
  htmlToPlainText,
  safeFilename,
  standaloneHtml,
  toEditorHtml,
  wordHtml,
} from "@/lib/documents/convert";
import {
  DEFAULT_SETUP,
  loadSetup,
  pageBox,
  printRule,
  saveSetup,
  type PageSetup,
} from "@/lib/documents/page";
import { analyze, EMPTY_STATS } from "@/lib/documents/insights";
import { cn } from "@/lib/utils";
import "@/components/docs/editor/editor.css";

const AUTOSAVE_MS = 900;
/** How long after the last keystroke the insights are recounted. */
const STATS_MS = 400;
/**
 * The largest picture that may be pasted into a document.
 *
 * Pictures are embedded, not linked, so the document carries its own
 * illustrations and never shows a broken image because a link expired. The
 * cost is that they are stored inside the row, which is why there is a ceiling.
 */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** What the format painter carries between one selection and the next. */
interface PaintedFormat {
  marks: { type: string; attrs: Record<string, unknown> }[];
  from: number;
  to: number;
}

const PLACEHOLDER =
  "Start writing. Everything on the Home tab works as you would expect, and Ctrl+S saves right away.";

export default function DocEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { byId, loading, patch, setTrashed } = useDocuments();

  const node = id ? byId.get(id) : undefined;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [tab, setTab] = useState<RibbonTab>("home");
  const [setup, setSetup] = useState<PageSetup>(DEFAULT_SETUP);
  const [view, setView] = useState<ViewState>({
    outline: true,
    insights: false,
    focus: false,
    spellcheck: true,
    ruler: true,
    zoom: 1,
  });
  const [findOpen, setFindOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  /** The formatting the painter is carrying, and the selection it came from. */
  const [painter, setPainter] = useState<PaintedFormat | null>(null);
  const [version, setVersion] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [breaks, setBreaks] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [shellTop, setShellTop] = useState(64);
  const shell = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLDivElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);

  const box = useMemo(() => pageBox(setup), [setup]);

  /*
   * Paste and drop reach the editor through a ref.
   *
   * `editorProps` is read once, when the editor is built, so a handler written
   * inline there would close over the first render's bindings for ever — and
   * on that render the editor itself does not exist yet.
   */
  const onTransfer = useRef<(data: DataTransfer | null) => boolean>(() => false);

  const editor = useEditor({
    extensions: documentExtensions(PLACEHOLDER),
    content: "",
    editorProps: {
      attributes: { class: "pf-doc", spellcheck: "true" },
      handlePaste: (_view, event) => onTransfer.current(event.clipboardData),
      handleDrop: (_view, event) => onTransfer.current((event as DragEvent).dataTransfer),
    },
    onUpdate: () => {
      setStatus("dirty");
      setVersion((value) => value + 1);
    },
  });

  /* ── Saving ──────────────────────────────────────────────────────── */

  const writeTo = useCallback(
    async (id: string, nextTitle: string, html: string) => {
      const trimmed = nextTitle.trim();
      setStatus("saving");
      try {
        await patch(id, {
          // The database refuses a blank title, and an untitled draft is a
          // normal thing to have, so it gets a name rather than an error.
          title: trimmed || "Untitled document",
          content: html,
        });
        setStatus("saved");
      } catch (cause) {
        setStatus("dirty");
        toast({
          title: "Could not save",
          description: cause instanceof Error ? cause.message : undefined,
          variant: "destructive",
        });
      }
    },
    [patch, toast],
  );

  const save = useCallback(
    (nextTitle: string, html: string) => (node ? writeTo(node.id, nextTitle, html) : undefined),
    [node, writeTo],
  );

  /** Debounced autosave. The timer restarts on every keystroke. */
  useEffect(() => {
    if (status !== "dirty" || !node || !editor) return;
    const timer = window.setTimeout(() => void save(title, editor.getHTML()), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [status, title, version, node, editor, save]);

  /**
   * Unsaved text when the page goes away would be lost, so it is flushed on the
   * way out — when the tab hides, and when this page unmounts.
   *
   * The listener is registered once and reads the latest state through a ref.
   * Re-registering it on every keystroke would run its own cleanup on every
   * keystroke, and the cleanup is the flush: the debounce would never elapse
   * because a save would already have fired.
   */
  const latest = useRef({ status, title, editor, save });
  latest.current = { status, title, editor, save };

  useEffect(() => {
    const flush = () => {
      const { status: state, title: name, editor: instance, save: write } = latest.current;
      if (state === "dirty" && instance) void write(name, instance.getHTML());
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  /* ── Content in ──────────────────────────────────────────────────── */

  /**
   * The row seeds the editor once.
   *
   * `useDocuments` refetches and the row identity changes on every save, so
   * copying it into the editor on every change would overwrite what is being
   * typed with what was last saved — the classic cursor-jumping autosave bug.
   * This only seeds when the document being edited actually changes.
   */
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    if (!editor || !node || seeded.current === node.id) return;
    /*
     * Opening a second document from inside the first leaves this page
     * mounted, so the debounced save is still pending — and it would fire
     * against the row now on screen, writing the first document's text over
     * the second. What is in the editor still belongs to the document being
     * left, so it is written there before the swap.
     */
    const leaving = seeded.current;
    if (leaving && latest.current.status === "dirty") {
      void writeTo(leaving, latest.current.title, editor.getHTML());
    }

    seeded.current = node.id;
    setTitle(node.title);
    setSetup(loadSetup(node.id));
    // Out of the undo stack: the first Ctrl+Z in a freshly opened document
    // must not empty it, and an empty document autosaves over the real one.
    editor
      .chain()
      .setMeta("addToHistory", false)
      .setContent(toEditorHtml(node.content), false)
      .run();
    setStatus("idle");
    setVersion((value) => value + 1);
  }, [editor, node, writeTo]);

  /* ── Format painter ──────────────────────────────────────────────── */

  /**
   * Pick up the formatting of what is selected, then paint it onto whatever is
   * selected next — Word's paintbrush, and for the same reason: matching a
   * heading's face, size and colour by hand is six controls and a mistake.
   *
   * Only character formatting travels. Paragraph shape — alignment, spacing,
   * indent — stays with the paragraph, which is what a student who paints one
   * word inside a sentence expects.
   */
  const armPainter = useCallback(() => {
    if (!editor) return;
    if (painter) {
      setPainter(null);
      return;
    }
    const { $from, $to, empty } = editor.state.selection;
    const marks = (empty ? $from.marks() : ($from.marksAcross($to) ?? [])).map((mark) => ({
      type: mark.type.name,
      attrs: mark.attrs,
    }));
    setPainter({ marks, from: editor.state.selection.from, to: editor.state.selection.to });
  }, [editor, painter]);

  const selectionKey = editor
    ? `${editor.state.selection.from}-${editor.state.selection.to}`
    : "";

  useEffect(() => {
    if (!painter || !editor) return;
    const { from, to, empty } = editor.state.selection;
    // The selection the formatting was taken from is not a target.
    if (empty || (from === painter.from && to === painter.to)) return;
    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .command(({ tr, state }) => {
        for (const mark of painter.marks) {
          const type = state.schema.marks[mark.type];
          if (type) tr.addMark(from, to, type.create(mark.attrs));
        }
        return true;
      })
      .run();
    setPainter(null);
  }, [painter, editor, selectionKey]);

  /* ── Table of contents ───────────────────────────────────────────── */

  /**
   * The document's headings, written into the document as a list.
   *
   * A snapshot, not a field: it is the headings as they are now, indented by
   * level. Word's is a field that refreshes; this one is re-inserted, which is
   * honest about what it is and never quietly disagrees with the text.
   */
  const insertContents = useCallback(() => {
    if (!editor) return;
    const entries: { level: number; text: string }[] = [];
    editor.state.doc.descendants((child) => {
      if (child.type.name === "heading") {
        entries.push({
          level: Number(child.attrs.level) || 1,
          text: child.textContent.trim(),
        });
      }
      return true;
    });

    if (!entries.length) {
      toast({
        title: "No headings to list",
        description: "Give your sections headings and the contents can be built from them.",
      });
      return;
    }

    const escaped = (value: string) =>
      value.replace(/[<>&]/g, (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"));
    const html = [
      "<h2>Contents</h2>",
      ...entries.map(
        (entry) =>
          `<p style="margin-left: ${(entry.level - 1) * 24}px">${escaped(
            entry.text || "Untitled heading",
          )}</p>`,
      ),
    ].join("");
    editor.chain().focus().insertContent(html).run();
  }, [editor, toast]);

  /* ── Page setup ──────────────────────────────────────────────────── */

  const changeSetup = useCallback(
    (patchSetup: Partial<PageSetup>) => {
      setSetup((current) => {
        const next = { ...current, ...patchSetup };
        if (node) saveSetup(node.id, next);
        return next;
      });
    },
    [node],
  );

  /** The `@page` rule, which can only be written as a stylesheet. */
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-pf-page", "");
    style.textContent = printRule(setup);
    document.head.appendChild(style);
    return () => style.remove();
  }, [setup]);

  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: { class: "pf-doc", spellcheck: String(view.spellcheck) },
      },
    });
  }, [editor, view.spellcheck]);

  /* ── Measuring ───────────────────────────────────────────────────── */

  /**
   * Where the paper breaks.
   *
   * A word processor lays text out page by page; this lays it out in one
   * column and works out where the boundaries fall. The two agree because the
   * column is exactly the width and the type exactly the size that the `@page`
   * rule prints at, so a guide drawn here is a break that really happens.
   */
  useEffect(() => {
    const element = editor?.view.dom as HTMLElement | undefined;
    if (!element) return;
    const measure = () => setBreaks(pageBreaks(element, box.contentHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [editor, version, box.contentHeight]);

  /** What is selected, counted — "42 of 900 words", as a word processor says. */
  const selectedWords = (() => {
    if (!editor || editor.state.selection.empty) return 0;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ", " ");
    return (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
  })();

  /**
   * Where to hang the table toolbar, in the sheet's own coordinates.
   *
   * This used to be TipTap's `BubbleMenu`, which positions with tippy — and
   * tippy moves the element it is given into a root of its own on the body.
   * React still believes that element is a child of this page, so the next
   * render that removes a sibling throws `removeChild ... not a child of this
   * node` and the app's error boundary catches it. Measuring the table and
   * placing an ordinary absolute div inside the sheet has no such argument
   * about who owns the DOM.
   */
  const tableAt = (() => {
    if (!editor || !sheet.current || !editor.isActive("table")) return null;
    const at = editor.view.domAtPos(editor.state.selection.from).node as Node;
    const element = (at.nodeType === 1 ? (at as HTMLElement) : at.parentElement) ?? null;
    const table = element?.closest("table");
    if (!table) return null;
    const box = table.getBoundingClientRect();
    const page = sheet.current.getBoundingClientRect();
    return {
      top: Math.max(4, (box.top - page.top) / view.zoom - 40),
      left: Math.max(0, (box.left - page.left) / view.zoom),
    };
  })();

  const pages = breaks.length + 1;
  const lastBreak = breaks.length ? breaks[breaks.length - 1] : 0;
  const sheetHeight = box.padY * 2 + lastBreak + box.contentHeight;

  /**
   * The editor fills what is left of the window under the app's chrome.
   *
   * Measured rather than assumed: the navbar is 4rem today, but a verification
   * banner or an announcement above it would push this down, and a shell that
   * is taller than the space it has scrolls the whole page — which moves the
   * navbar off screen and leaves the status bar below the fold.
   */
  useLayoutEffect(() => {
    const element = shell.current;
    if (!element) return;
    const measure = () =>
      setShellTop(Math.round(element.getBoundingClientRect().top + window.scrollY));
    measure();
    window.scrollTo({ top: 0 });
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /**
   * A page too wide for the window opens zoomed to fit.
   *
   * On a phone an A4 sheet is twice the width of the screen, and an editor
   * that opens showing the left half of the paper is an editor nobody can
   * read. This only ever shrinks — once it fits, whatever zoom the student
   * chose is theirs.
   */
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const width = element.clientWidth;
    if (!width || width >= box.width + 32) return;
    const fit = [...ZOOM_LEVELS].reverse().find((level) => box.width * level <= width - 32);
    setView((current) =>
      current.zoom <= (fit ?? ZOOM_LEVELS[0]) ? current : { ...current, zoom: fit ?? ZOOM_LEVELS[0] },
    );
  }, [box.width]);
  // TipTap re-renders this component on every transaction, so reading the
  // selection during render is always current.
  const caret = editor?.state.selection.from ?? 0;

  /** Which page the caret is on, for the status bar. */
  useEffect(() => {
    if (!editor || !editor.view.dom.isConnected) return;
    try {
      const coords = editor.view.coordsAtPos(editor.state.selection.from);
      const top = editor.view.dom.getBoundingClientRect().top;
      const offset = (coords.top - top) / view.zoom;
      setPage(breaks.filter((at) => at <= offset).length + 1);
    } catch {
      // coordsAtPos throws while the view is being rebuilt; the next
      // selection change will get it.
    }
  }, [editor, caret, breaks, view.zoom]);

  /** Insights, recounted a moment after typing stops. */
  useEffect(() => {
    if (!editor) return;
    const timer = window.setTimeout(() => {
      let blocks = 0;
      editor.state.doc.descendants((child) => {
        if (child.isTextblock && child.textContent.trim()) blocks += 1;
        return true;
      });
      setStats(analyze(editor.getText({ blockSeparator: "\n\n" }), blocks));
    }, STATS_MS);
    return () => window.clearTimeout(timer);
  }, [editor, version]);

  /* ── Pictures ────────────────────────────────────────────────────── */

  const insertImageFile = useCallback(
    (file: File) => {
      if (!editor) return;
      if (!file.type.startsWith("image/")) return;
      if (file.size > MAX_IMAGE_BYTES) {
        toast({
          title: "That picture is too large",
          description: "Pictures are stored inside the document, so they are capped at 2MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result ?? "");
        if (src) editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    },
    [editor, toast],
  );

  /** Pasted or dropped pictures take the same path as inserted ones. */
  const insertImageFromTransfer = useCallback(
    (data: DataTransfer | null) => {
      const file = Array.from(data?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (!file) return false;
      insertImageFile(file);
      return true;
    },
    [insertImageFile],
  );

  useEffect(() => {
    onTransfer.current = insertImageFromTransfer;
  }, [insertImageFromTransfer]);

  /* ── Export ──────────────────────────────────────────────────────── */

  const exportAs = useCallback(
    (format: "html" | "word" | "markdown" | "text") => {
      if (!editor) return;
      const html = editor.getHTML();
      const name = title.trim() || "Untitled document";
      if (format === "html") {
        download(safeFilename(name, "html"), "text/html", standaloneHtml(name, html, setup));
      } else if (format === "word") {
        download(safeFilename(name, "doc"), "application/msword", wordHtml(name, html, setup));
      } else if (format === "markdown") {
        download(safeFilename(name, "md"), "text/markdown", htmlToMarkdown(html));
      } else {
        download(safeFilename(name, "txt"), "text/plain", htmlToPlainText(html));
      }
    },
    [editor, title, setup],
  );

  /* ── Keyboard ────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (editor) void save(title, editor.getHTML());
        return;
      }
      if (meta && (event.key.toLowerCase() === "f" || event.key.toLowerCase() === "h")) {
        event.preventDefault();
        setFindOpen(true);
        return;
      }
      if (meta && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setTab("insert");
        setLinkOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setPainter(null);
        setView((current) => (current.focus ? { ...current, focus: false } : current));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, save, title]);

  /* ── States ──────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-svh bg-muted/30">
        <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6">
          <Skeleton className="mb-4 h-9 w-52" />
          <Skeleton className="mb-3 h-11 w-full" />
          <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    );
  }

  if (!node || node.kind !== "doc") {
    return (
      <div className="min-h-svh bg-background">
        <Seo title="Document" description="A document in your Pathforge drive." path="/docs" />
        <div className="mx-auto w-full max-w-[860px] px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-xl font-semibold text-foreground">
            That document is not here
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted, or it is a file rather than a document.
          </p>
          <Button className="mt-4" onClick={() => navigate("/docs")}>
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "dirty"
          ? "Unsaved changes"
          : "";

  return (
    <div
      ref={shell}
      className="pf-editor-shell flex flex-col bg-muted/30"
      style={{ height: `calc(100svh - ${shellTop}px)` }}
    >
      <Seo
        title={node.title}
        description="A document in your Pathforge drive."
        path={`/docs/d/${node.id}`}
      />

      {/* ── Document bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-background px-2 py-1.5 sm:px-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2"
          onClick={() => navigate(node.parent_id ? `/docs?folder=${node.parent_id}` : "/docs")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Documents</span>
        </Button>

        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setStatus("dirty");
          }}
          placeholder="Untitled document"
          aria-label="Document title"
          className="h-8 max-w-[420px] border-0 bg-transparent px-1.5 font-display text-[15px] font-semibold shadow-none focus-visible:ring-1"
        />

        <span
          className={cn(
            "hidden items-center gap-1 text-[12px] text-muted-foreground sm:flex",
            status === "saved" && "text-success",
          )}
          aria-live="polite"
        >
          {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {status === "saved" && <Check className="h-3.5 w-3.5" />}
          {statusLabel}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <FileDown className="h-4 w-4" />
                <span className="ml-1 hidden text-[12.5px] sm:inline">Export</span>
                <ChevronDown className="ml-0.5 h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[230px]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Download a copy
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => exportAs("word")}>
                Word document (.doc)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("html")}>
                Web page (.html)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("markdown")}>
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("text")}>
                Plain text (.txt)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print, or save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={node.starred ? "Remove star" : "Star this document"}
            onClick={() => void patch(node.id, { starred: !node.starred })}
          >
            <Star className={cn("h-4 w-4", node.starred && "fill-amber-400 text-amber-400")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Move to trash"
            onClick={async () => {
              await setTrashed(node.id, true);
              toast({ title: "Moved to trash", description: node.title });
              navigate("/docs");
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Ribbon ───────────────────────────────────────────────── */}
      {editor && !view.focus && (
        <Ribbon
          editor={editor}
          tab={tab}
          onTab={setTab}
          setup={setup}
          onSetup={changeSetup}
          view={view}
          onView={(patchView) => setView((current) => ({ ...current, ...patchView }))}
          onFind={() => setFindOpen(true)}
          onImageFile={insertImageFile}
          onExport={() => exportAs("html")}
          painter={!!painter}
          onPainter={armPainter}
          linkOpen={linkOpen}
          onLinkOpen={setLinkOpen}
          onContents={insertContents}
        />
      )}

      {editor && findOpen && <FindBar editor={editor} onClose={() => setFindOpen(false)} />}

      {/* ── Panes and page ───────────────────────────────────────── */}
      {/*
        `pf-print-keep` marks the boxes between the shell and the sheet. On
        paper everything beside them is taken out of the layout rather than
        merely hidden: a pane that is invisible but still 220px wide makes the
        page wider than the paper, and Chrome answers that by shrinking the
        whole document to fit — which prints an 11pt essay at about 7pt and
        puts the page breaks somewhere the editor never drew them.
      */}
      <div className="pf-print-keep flex min-h-0 flex-1">
        {editor && view.outline && !view.focus && (
          <OutlinePane
            editor={editor}
            onClose={() => setView((current) => ({ ...current, outline: false }))}
          />
        )}

        <div ref={canvas} className="pf-print-keep min-w-0 flex-1 overflow-auto">
          <div
            className="pf-print-keep mx-auto pb-6 pt-3"
            style={{ width: box.width * view.zoom }}
          >
            {editor && view.ruler && !view.focus && (
              /*
                Two backgrounds, because this strip sits over the paper while
                the page scrolls under it: the canvas's own tint is
                translucent, and one layer of it would let the sheet show
                through the ruler.
              */
              <div className="sticky top-0 z-20 mb-3 bg-background">
                <div className="bg-muted/30 pb-1">
                  <Ruler editor={editor} box={box} zoom={view.zoom} />
                </div>
              </div>
            )}
            <div className="pf-print-keep" style={{ height: sheetHeight * view.zoom }}>
              <div
                ref={sheet}
                className="pf-sheet pf-print-root relative rounded-[2px]"
                /*
                 * Clicking the margin, or the empty space under the last line,
                 * puts the caret at the end. On a page that space is part of
                 * the document; without this it is dead area, and the student
                 * clicks it and nothing happens.
                 */
                onMouseDown={(event) => {
                  if (!editor) return;
                  if ((event.target as HTMLElement).closest(".ProseMirror")) return;
                  event.preventDefault();
                  editor.commands.focus("end");
                }}
                style={{
                  width: box.width,
                  minHeight: sheetHeight,
                  paddingLeft: box.padX,
                  paddingRight: box.padX,
                  paddingTop: box.padY,
                  paddingBottom: box.padY,
                  transform: `scale(${view.zoom})`,
                  transformOrigin: "top left",
                  fontFamily: setup.fontFamily,
                  fontSize: `${setup.fontSize}pt`,
                  lineHeight: setup.lineHeight,
                  ["--pf-para-space" as string]: `${setup.paragraphSpacing}px`,
                }}
              >
                <EditorContent editor={editor} />


                {/* Table tools, while the caret is in one. */}
                {tableAt && (
                  <div
                    className="pf-table-tools absolute z-20 flex items-center gap-0.5 rounded-lg border border-border/70 bg-popover p-1 shadow-md"
                    style={{ top: tableAt.top, left: tableAt.left }}
                  >
                    <TableTool
                      label="Row above"
                      icon={Rows3}
                      onClick={() => editor.chain().focus().addRowBefore().run()}
                    />
                    <TableTool
                      label="Row below"
                      icon={Rows3}
                      onClick={() => editor.chain().focus().addRowAfter().run()}
                    />
                    <TableTool
                      label="Delete row"
                      icon={Trash}
                      onClick={() => editor.chain().focus().deleteRow().run()}
                    />
                    <span className="mx-0.5 h-5 w-px bg-border" />
                    <TableTool
                      label="Column left"
                      icon={Columns3}
                      onClick={() => editor.chain().focus().addColumnBefore().run()}
                    />
                    <TableTool
                      label="Column right"
                      icon={Columns3}
                      onClick={() => editor.chain().focus().addColumnAfter().run()}
                    />
                    <TableTool
                      label="Delete column"
                      icon={Trash}
                      onClick={() => editor.chain().focus().deleteColumn().run()}
                    />
                    <span className="mx-0.5 h-5 w-px bg-border" />
                    <TableTool
                      label="Merge or split cells"
                      icon={Table2}
                      onClick={() => editor.chain().focus().mergeOrSplit().run()}
                    />
                    <TableTool
                      label="Delete table"
                      icon={Trash2}
                      onClick={() => editor.chain().focus().deleteTable().run()}
                    />
                  </div>
                )}

                {/* Where the paper breaks. */}
                {breaks.map((at, i) => (
                  <div
                    key={`${i}-${at}`}
                    aria-hidden
                    className="pf-page-guide"
                    data-label={`Page ${i + 2}`}
                    style={{ top: box.padY + at }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {view.insights && !view.focus && (
          <InsightsPane
            stats={stats}
            pages={pages}
            onClose={() => setView((current) => ({ ...current, insights: false }))}
          />
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-background px-3 py-1.5 text-[12px] text-muted-foreground">
        <p className="tabular-nums">
          Page {page} of {pages}
          <span className="mx-2 opacity-40">·</span>
          {selectedWords
            ? `${selectedWords.toLocaleString()} of ${stats.words.toLocaleString()} words selected`
            : `${stats.words.toLocaleString()} ${stats.words === 1 ? "word" : "words"}`}
          <span className="mx-2 hidden opacity-40 sm:inline">·</span>
          <span className="hidden sm:inline">
            {stats.characters.toLocaleString()} characters
          </span>
        </p>

        <div className="flex items-center gap-1">
          <span className="mr-1 sm:hidden">{statusLabel}</span>
          <button
            type="button"
            aria-label="Zoom out"
            className="rounded p-1 transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setView((current) => ({ ...current, zoom: stepZoom(current.zoom, -1) }))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center tabular-nums">{Math.round(view.zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            className="rounded p-1 transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setView((current) => ({ ...current, zoom: stepZoom(current.zoom, 1) }))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The offsets, inside the text column, where each new page starts.
 *
 * A word processor lays text out page by page; this lays it out in one column
 * and works out where the boundaries fall. The two agree because the column is
 * exactly the width and the type exactly the size that the `@page` rule prints
 * at, so a guide drawn here is a break that really happens.
 *
 * What the printer will not split, this does not split either. A heading, a
 * picture, a list item and a table row all carry `break-inside: avoid` into
 * print, so when one of them straddles the bottom of a page the whole of it
 * moves down — exactly as it will on paper. A paragraph does split, and is
 * allowed to. Headings also keep their first line of text with them, which is
 * `break-after: avoid` on the page and one more rule here.
 */
function pageBreaks(root: HTMLElement, contentHeight: number): number[] {
  if (contentHeight <= 0) return [];
  const found: number[] = [];
  const boxes = flowBoxes(root);
  let origin = 0;

  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];

    if (box.isBreak) {
      origin = box.bottom;
      found.push(origin);
      continue;
    }

    if (box.bottom - origin <= contentHeight) continue;

    const height = box.bottom - box.top;
    // Either it begins past the bottom of the page, or it crosses the bottom
    // and is a thing the printer will not cut in half.
    const startsOver = box.top >= origin + contentHeight;
    const movesWhole = box.whole && height <= contentHeight && box.top > origin;

    if (startsOver || movesWhole) {
      // A heading goes with the text it introduces, so a break that would fall
      // between them is taken before the heading instead.
      const above = boxes[i - 1];
      origin = above && above.isHeading && above.top > origin ? above.top : box.top;
      found.push(origin);
    }

    while (box.bottom - origin > contentHeight) {
      origin += contentHeight;
      found.push(origin);
    }
  }

  // Trailing empty space still belongs to a page.
  while (root.scrollHeight - origin > contentHeight) {
    origin += contentHeight;
    found.push(origin);
  }
  return found;
}

interface FlowBox {
  top: number;
  bottom: number;
  /** True for a block the printer will not break inside. */
  whole: boolean;
  isHeading: boolean;
  isBreak: boolean;
}

/** Elements the printer will not break inside, and so neither does the guide. */
const UNBREAKABLE = /^(H1|H2|H3|H4|H5|H6|LI|TR|IMG|FIGURE)$/;
const HEADING = /^H[1-6]$/;

/**
 * The document's blocks, flattened to the boxes a page may break between.
 *
 * A list and a table are containers: the paper breaks between their items and
 * their rows, not around them whole, so they are walked into. Everything else
 * is measured as it stands.
 *
 * Offsets come from `offsetTop`, which is in layout pixels and so survives the
 * zoom transform — but only while every box shares the sheet as its offset
 * parent. A box that does not is measured as its container instead, which is
 * the old behaviour and still correct, just coarser.
 */
function flowBoxes(root: HTMLElement): FlowBox[] {
  /*
   * `offsetTop` is measured from the nearest positioned ancestor, and the
   * editor's own root is one — so its blocks are already measured from the top
   * of the text column and nothing is subtracted. If that ever stops being
   * true the sheet is the parent instead, and the root's own offset comes off
   * each block. Getting this backwards moves every guide by a margin.
   */
  const positioned = window.getComputedStyle(root).position !== "static";
  const base = positioned ? 0 : root.offsetTop;
  const parent = positioned ? root : root.offsetParent;
  const boxes: FlowBox[] = [];

  const push = (element: HTMLElement) => {
    boxes.push({
      top: element.offsetTop - base,
      bottom: element.offsetTop - base + element.offsetHeight,
      whole: UNBREAKABLE.test(element.tagName) || !!element.querySelector("img"),
      isHeading: HEADING.test(element.tagName),
      isBreak: element.hasAttribute("data-page-break"),
    });
  };

  for (const child of Array.from(root.children) as HTMLElement[]) {
    const table = child.tagName === "TABLE" ? child : child.querySelector("table");
    const rows = table ? (Array.from(table.querySelectorAll("tr")) as HTMLElement[]) : [];
    const items =
      child.tagName === "UL" || child.tagName === "OL"
        ? (Array.from(child.children) as HTMLElement[])
        : rows;

    if (items.length && items.every((item) => item.offsetParent === parent)) {
      items.forEach(push);
    } else {
      push(child);
    }
  }

  return boxes;
}

/** The next zoom step in `direction`, clamped to the ends. */
function stepZoom(current: number, direction: 1 | -1): number {
  const index = ZOOM_LEVELS.indexOf(current);
  const from = index < 0 ? ZOOM_LEVELS.findIndex((level) => level >= current) : index;
  const at = from < 0 ? ZOOM_LEVELS.length - 1 : from;
  return ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, at + direction))];
}

function TableTool({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
