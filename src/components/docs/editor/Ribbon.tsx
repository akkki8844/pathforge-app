/**
 * The ribbon.
 *
 * Five tabs, grouped the way a word processor groups them, because that is the
 * arrangement a student already knows: writing is on Home, everything that
 * adds an object is on Insert, the paper is on Layout, proofing and counting
 * are on Review, and what is on screen is on View.
 *
 * Every control reads its state straight from the editor — `isActive`,
 * `getAttributes` — rather than from a copy kept alongside. TipTap re-renders
 * this component on each transaction, so the toolbar can never disagree with
 * the caret, which is the failure that makes a toolbar feel broken.
 */

import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  AArrowDown,
  AArrowUp,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Brush,
  CalendarDays,
  CaseUpper,
  Code2,
  Columns3,
  Eraser,
  FileDown,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Indent,
  Italic,
  Link2,
  List,
  ListTree,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minus,
  Outdent,
  PanelLeft,
  PanelRight,
  Quote,
  Redo2,
  Omega,
  Rows3,
  Ruler as RulerIcon,
  Search,
  SpellCheck,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  ColorPicker,
  Dropdown,
  Group,
  GroupDivider,
  ImagePopover,
  LinkPopover,
  MenuButton,
  SymbolPicker,
  TablePicker,
  Tool,
  WideTool,
} from "./controls";
import { FONT_SIZES, type TextCase } from "./extensions";
import { MARGINS, PAPERS, type MarginId, type PageSetup, type PaperId } from "@/lib/documents/page";
import { cn } from "@/lib/utils";

export type RibbonTab = "home" | "insert" | "layout" | "review" | "view";

export interface ViewState {
  outline: boolean;
  insights: boolean;
  focus: boolean;
  spellcheck: boolean;
  ruler: boolean;
  /** 1 is 100%. */
  zoom: number;
}

const TABS: { id: RibbonTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "layout", label: "Layout" },
  { id: "review", label: "Review" },
  { id: "view", label: "View" },
];

/** Stacks a student will actually have: the app's own faces, then the classics. */
const FONTS: { label: string; stack: string }[] = [
  { label: "Plus Jakarta Sans", stack: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { label: "Sora", stack: "Sora, system-ui, sans-serif" },
  { label: "Inter", stack: '"Inter Variable", Inter, system-ui, sans-serif' },
  { label: "Fraunces", stack: '"Fraunces Variable", Fraunces, Georgia, serif' },
  { label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
  { label: "Courier New", stack: "'Courier New', Courier, monospace" },
  { label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", stack: "'Trebuchet MS', sans-serif" },
];

const SIZES = FONT_SIZES;
const LINE_HEIGHTS = [1, 1.15, 1.5, 2, 2.5, 3];
/** Also used by the status bar, so both controls step the same way. */
export const ZOOM_LEVELS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2];
const ZOOMS = ZOOM_LEVELS;

export interface RibbonProps {
  editor: Editor;
  tab: RibbonTab;
  onTab: (tab: RibbonTab) => void;
  setup: PageSetup;
  onSetup: (patch: Partial<PageSetup>) => void;
  view: ViewState;
  onView: (patch: Partial<ViewState>) => void;
  onFind: () => void;
  onImageFile: (file: File) => void;
  onExport: () => void;
  /** The format painter is armed until the next selection is painted. */
  painter: boolean;
  onPainter: () => void;
  linkOpen: boolean;
  onLinkOpen: (open: boolean) => void;
  onContents: () => void;
}

/**
 * What a student types into the link box, as an address.
 *
 * "example.com" is a domain, not a relative path, and a link to it should
 * leave the site rather than ask this one for a page of that name. Anything
 * that already names a scheme is left exactly as it was typed.
 */
function address(href: string): string {
  const value = href.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.startsWith("#")) {
    return value;
  }
  return /^[^\s/]+\.[^\s/]{2,}/.test(value) ? `https://${value}` : value;
}

export function Ribbon({
  editor,
  tab,
  onTab,
  setup,
  onSetup,
  view,
  onView,
  onFind,
  onImageFile,
  onExport,
  painter,
  onPainter,
  linkOpen,
  onLinkOpen,
  onContents,
}: RibbonProps) {
  const run = useCallback(() => editor.chain().focus(), [editor]);
  // Every control in the ribbon hands the caret back when it closes; a menu
  // that leaves focus on itself makes the next keystroke disappear.
  const refocus = useCallback(() => editor.commands.focus(), [editor]);

  const textStyle = editor.getAttributes("textStyle");
  const sizeNow = (() => {
    const parsed = parseFloat(String(textStyle.fontSize ?? ""));
    return Number.isFinite(parsed) ? parsed : setup.fontSize;
  })();
  const familyNow = String(textStyle.fontFamily ?? setup.fontFamily);
  const lineHeightNow = Number(
    editor.getAttributes("paragraph").lineHeight ??
      editor.getAttributes("heading").lineHeight ??
      setup.lineHeight,
  );

  const styleNow = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("heading", { level: 4 })
          ? "h4"
          : editor.isActive("blockquote")
            ? "quote"
            : editor.isActive("codeBlock")
              ? "code"
              : "normal";

  const applyStyle = (value: string) => {
    const chain = run().clearNodes();
    if (value === "normal") chain.setParagraph().run();
    else if (value === "quote") chain.toggleBlockquote().run();
    else if (value === "code") chain.toggleCodeBlock().run();
    else chain.toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 | 4 }).run();
  };

  // Strictly the next size along, so growing from a size that is not on the
  // list (13pt, pasted from elsewhere) goes to 14 rather than skipping it.
  const stepSize = (direction: 1 | -1) => {
    const next =
      direction > 0
        ? SIZES.find((size) => size > sizeNow)
        : [...SIZES].reverse().find((size) => size < sizeNow);
    if (next) run().setFontSize(`${next}pt`).run();
  };

  const CASES: { label: string; mode: TextCase; preview: string }[] = [
    { label: "Sentence case", mode: "sentence", preview: "Sentence case" },
    { label: "lowercase", mode: "lower", preview: "lowercase" },
    { label: "UPPERCASE", mode: "upper", preview: "UPPERCASE" },
    { label: "Capitalise Each Word", mode: "title", preview: "Capitalise Each Word" },
    { label: "tOGGLE cASE", mode: "toggle", preview: "tOGGLE cASE" },
  ];

  const inTable = editor.isActive("table");

  return (
    <div className="border-b border-border/60 bg-muted/30">
      {/* Tab strip */}
      <div className="flex items-center gap-1 px-2 pt-1.5 sm:px-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onTab(item.id)}
            className={cn(
              "relative rounded-t-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              tab === item.id
                ? "bg-background text-foreground shadow-[inset_0_1px_0_hsl(var(--border)),inset_1px_0_0_hsl(var(--border)),inset_-1px_0_0_hsl(var(--border))]"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Ribbon body */}
      {/*
        The ribbon scrolls sideways when it is wider than the window, the way
        a ribbon always has. The scrollbar itself is hidden: it would sit as a
        grey rule between the toolbar and the document, and the groups running
        to the edge already say there is more.
      */}
      <div className="pf-ribbon flex items-stretch gap-0 overflow-x-auto border-t border-border/60 bg-background px-2 py-2 sm:px-3">
        {tab === "home" && (
          <>
            <Group label="Undo">
              <Tool
                icon={Undo2}
                label="Undo"
                shortcut="Ctrl+Z"
                disabled={!editor.can().undo()}
                onClick={() => run().undo().run()}
              />
              <Tool
                icon={Redo2}
                label="Redo"
                shortcut="Ctrl+Y"
                disabled={!editor.can().redo()}
                onClick={() => run().redo().run()}
              />
              <Tool
                icon={Brush}
                label={painter ? "Painting — select the text to format" : "Format painter"}
                active={painter}
                onClick={onPainter}
              />
              <Tool
                icon={Eraser}
                label="Clear formatting"
                shortcut="Ctrl+Space"
                onClick={() => run().unsetAllMarks().clearNodes().run()}
              />
            </Group>

            <GroupDivider />

            <Group label="Font">
              <Dropdown
                title="Font"
                onRefocus={refocus}
                width={150}
                value={familyNow}
                onValue={(value) => run().setFontFamily(value).run()}
                options={FONTS.map((font) => ({
                  value: font.stack,
                  label: font.label,
                  style: { fontFamily: font.stack },
                }))}
              />
              <Dropdown
                title="Font size"
                onRefocus={refocus}
                width={66}
                value={String(sizeNow)}
                onValue={(value) => run().setFontSize(`${value}pt`).run()}
                options={(SIZES.includes(sizeNow) ? SIZES : [...SIZES, sizeNow].sort((a, b) => a - b))
                  .map((size) => ({ value: String(size), label: String(size) }))}
              />
              <Tool icon={AArrowUp} label="Grow font" onClick={() => stepSize(1)} />
              <Tool icon={AArrowDown} label="Shrink font" onClick={() => stepSize(-1)} />
              <Tool
                icon={Bold}
                label="Bold"
                shortcut="Ctrl+B"
                active={editor.isActive("bold")}
                onClick={() => run().toggleBold().run()}
              />
              <Tool
                icon={Italic}
                label="Italic"
                shortcut="Ctrl+I"
                active={editor.isActive("italic")}
                onClick={() => run().toggleItalic().run()}
              />
              <Tool
                icon={UnderlineIcon}
                label="Underline"
                shortcut="Ctrl+U"
                active={editor.isActive("underline")}
                onClick={() => run().toggleUnderline().run()}
              />
              <Tool
                icon={Strikethrough}
                label="Strikethrough"
                active={editor.isActive("strike")}
                onClick={() => run().toggleStrike().run()}
              />
              <Tool
                icon={SubscriptIcon}
                label="Subscript"
                active={editor.isActive("subscript")}
                onClick={() => run().toggleSubscript().run()}
              />
              <Tool
                icon={SuperscriptIcon}
                label="Superscript"
                active={editor.isActive("superscript")}
                onClick={() => run().toggleSuperscript().run()}
              />
              <ColorPicker
                icon={Baseline}
                label="Text colour"
                value={(textStyle.color as string) ?? null}
                onPick={(color) => run().setColor(color).run()}
                onClear={() => run().unsetColor().run()}
                clearLabel="Automatic"
              />
              <MenuButton
                icon={CaseUpper}
                label="Change case"
                width={230}
                onRefocus={refocus}
                items={CASES.map((item) => ({
                  label: item.label,
                  preview: item.preview,
                  hint: item.mode === "sentence" ? "Shift+F3" : undefined,
                  onSelect: () => run().setTextCase(item.mode).run(),
                }))}
              />
              <ColorPicker
                icon={Highlighter}
                label="Highlight"
                value={(editor.getAttributes("highlight").color as string) ?? null}
                onPick={(color) => run().setHighlight({ color }).run()}
                onClear={() => run().unsetHighlight().run()}
                clearLabel="No colour"
              />
            </Group>

            <GroupDivider />

            <Group label="Paragraph">
              <Tool
                icon={List}
                label="Bulleted list"
                active={editor.isActive("bulletList")}
                onClick={() => run().toggleBulletList().run()}
              />
              <Tool
                icon={ListOrdered}
                label="Numbered list"
                active={editor.isActive("orderedList")}
                onClick={() => run().toggleOrderedList().run()}
              />
              <Tool
                icon={ListChecks}
                label="Checklist"
                active={editor.isActive("taskList")}
                onClick={() => run().toggleTaskList().run()}
              />
              <Tool icon={Outdent} label="Decrease indent" onClick={() => run().outdentBlock().run()} />
              <Tool icon={Indent} label="Increase indent" onClick={() => run().indentBlock().run()} />
              <Tool
                icon={AlignLeft}
                label="Align left"
                active={editor.isActive({ textAlign: "left" })}
                onClick={() => run().setTextAlign("left").run()}
              />
              <Tool
                icon={AlignCenter}
                label="Centre"
                active={editor.isActive({ textAlign: "center" })}
                onClick={() => run().setTextAlign("center").run()}
              />
              <Tool
                icon={AlignRight}
                label="Align right"
                active={editor.isActive({ textAlign: "right" })}
                onClick={() => run().setTextAlign("right").run()}
              />
              <Tool
                icon={AlignJustify}
                label="Justify"
                active={editor.isActive({ textAlign: "justify" })}
                onClick={() => run().setTextAlign("justify").run()}
              />
              <Dropdown
                title="Line spacing"
                width={74}
                onRefocus={refocus}
                value={String(lineHeightNow)}
                onValue={(value) => run().setLineHeight(Number(value)).run()}
                options={LINE_HEIGHTS.map((value) => ({
                  value: String(value),
                  label: value.toFixed(2).replace(/\.?0+$/, ""),
                }))}
              />
            </Group>

            <GroupDivider />

            <Group label="Styles">
              <Dropdown
                title="Paragraph style"
                onRefocus={refocus}
                width={128}
                value={styleNow}
                onValue={applyStyle}
                options={[
                  { value: "normal", label: "Normal text" },
                  { value: "h1", label: "Heading 1" },
                  { value: "h2", label: "Heading 2" },
                  { value: "h3", label: "Heading 3" },
                  { value: "h4", label: "Heading 4" },
                  { value: "quote", label: "Quote" },
                  { value: "code", label: "Code block" },
                ]}
              />
              <Tool
                icon={Heading1}
                label="Heading 1"
                active={editor.isActive("heading", { level: 1 })}
                onClick={() => run().toggleHeading({ level: 1 }).run()}
              />
              <Tool
                icon={Heading2}
                label="Heading 2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => run().toggleHeading({ level: 2 }).run()}
              />
              <Tool
                icon={Heading3}
                label="Heading 3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() => run().toggleHeading({ level: 3 }).run()}
              />
            </Group>
          </>
        )}

        {tab === "insert" && (
          <>
            <Group label="Pages">
              <WideTool
                icon={FileDown}
                label="Page break"
                onClick={() => run().insertPageBreak().run()}
              />
              <WideTool icon={ListTree} label="Table of contents" onClick={onContents} />
            </Group>

            <GroupDivider />

            <Group label="Table">
              <TablePicker
                icon={Table2}
                onRefocus={refocus}
                onInsert={(rows, cols) =>
                  run().insertTable({ rows, cols, withHeaderRow: true }).run()
                }
              />
              <Tool
                icon={Rows3}
                label="Insert row below"
                disabled={!inTable}
                onClick={() => run().addRowAfter().run()}
              />
              <Tool
                icon={Columns3}
                label="Insert column right"
                disabled={!inTable}
                onClick={() => run().addColumnAfter().run()}
              />
              <Tool
                icon={Trash2}
                label="Delete table"
                disabled={!inTable}
                onClick={() => run().deleteTable().run()}
              />
            </Group>

            <GroupDivider />

            <Group label="Illustrations">
              <ImagePopover
                icon={ImagePlus}
                onFile={onImageFile}
                onRefocus={refocus}
                onUrl={(src) => run().setImage({ src }).run()}
              />
            </Group>

            <GroupDivider />

            <Group label="Links">
              <LinkPopover
                icon={Link2}
                open={linkOpen}
                onOpenChange={onLinkOpen}
                onRefocus={refocus}
                href={(editor.getAttributes("link").href as string) ?? ""}
                onApply={(href) =>
                  href
                    ? run().extendMarkRange("link").setLink({ href: address(href) }).run()
                    : run().extendMarkRange("link").unsetLink().run()
                }
                onRemove={() => run().extendMarkRange("link").unsetLink().run()}
              />
            </Group>

            <GroupDivider />

            <Group label="Text">
              <Tool
                icon={Quote}
                label="Quote"
                active={editor.isActive("blockquote")}
                onClick={() => run().toggleBlockquote().run()}
              />
              <Tool
                icon={Code2}
                label="Code block"
                active={editor.isActive("codeBlock")}
                onClick={() => run().toggleCodeBlock().run()}
              />
              <Tool
                icon={Minus}
                label="Horizontal line"
                onClick={() => run().setHorizontalRule().run()}
              />
              <SymbolPicker
                icon={Omega}
                onInsert={(glyph) => run().insertContent(glyph).run()}
                onRefocus={refocus}
              />
              <Tool
                icon={CalendarDays}
                label="Today's date"
                onClick={() =>
                  run()
                    .insertContent(
                      new Date().toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }),
                    )
                    .run()
                }
              />
            </Group>
          </>
        )}

        {tab === "layout" && (
          <>
            <Group label="Page setup">
              <Dropdown
                title="Paper size"
                onRefocus={refocus}
                width={110}
                value={setup.paper}
                onValue={(value) => onSetup({ paper: value as PaperId })}
                options={Object.entries(PAPERS).map(([id, paper]) => ({
                  value: id,
                  label: paper.label,
                }))}
              />
              <Dropdown
                title="Orientation"
                onRefocus={refocus}
                width={118}
                value={setup.landscape ? "landscape" : "portrait"}
                onValue={(value) => onSetup({ landscape: value === "landscape" })}
                options={[
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
              <Dropdown
                title="Margins"
                onRefocus={refocus}
                width={132}
                value={setup.margin}
                onValue={(value) => onSetup({ margin: value as MarginId })}
                options={Object.entries(MARGINS).map(([id, margin]) => ({
                  value: id,
                  label: margin.label,
                }))}
              />
            </Group>

            <GroupDivider />

            <Group label="Document type">
              <Dropdown
                title="Body font"
                onRefocus={refocus}
                width={150}
                value={setup.fontFamily}
                onValue={(value) => onSetup({ fontFamily: value })}
                options={FONTS.map((font) => ({
                  value: font.stack,
                  label: font.label,
                  style: { fontFamily: font.stack },
                }))}
              />
              <Dropdown
                title="Body size"
                onRefocus={refocus}
                width={66}
                value={String(setup.fontSize)}
                onValue={(value) => onSetup({ fontSize: Number(value) })}
                options={SIZES.map((size) => ({ value: String(size), label: String(size) }))}
              />
            </Group>

            <GroupDivider />

            <Group label="Spacing">
              <Dropdown
                title="Line spacing"
                onRefocus={refocus}
                width={92}
                value={String(setup.lineHeight)}
                onValue={(value) => onSetup({ lineHeight: Number(value) })}
                options={LINE_HEIGHTS.map((value) => ({
                  value: String(value),
                  label: `${value.toFixed(2).replace(/\.?0+$/, "")} lines`,
                }))}
              />
              <Dropdown
                title="Space after a paragraph"
                onRefocus={refocus}
                width={96}
                value={String(setup.paragraphSpacing)}
                onValue={(value) => onSetup({ paragraphSpacing: Number(value) })}
                options={[0, 4, 6, 8, 10, 14, 18, 24].map((value) => ({
                  value: String(value),
                  label: `${value} px`,
                }))}
              />
            </Group>
          </>
        )}

        {tab === "review" && (
          <>
            <Group label="Proofing">
              <WideTool
                icon={SpellCheck}
                label={view.spellcheck ? "Spelling on" : "Spelling off"}
                active={view.spellcheck}
                onClick={() => onView({ spellcheck: !view.spellcheck })}
              />
            </Group>

            <GroupDivider />

            <Group label="Editing">
              <WideTool icon={Search} label="Find and replace" onClick={onFind} />
            </Group>

            <GroupDivider />

            <Group label="Insights">
              <WideTool
                icon={PanelRight}
                label="Word count and readability"
                active={view.insights}
                onClick={() => onView({ insights: !view.insights })}
              />
            </Group>

            <GroupDivider />

            <Group label="Share">
              <WideTool icon={FileDown} label="Export a copy" onClick={onExport} />
            </Group>
          </>
        )}

        {tab === "view" && (
          <>
            <Group label="Panes">
              <WideTool
                icon={PanelLeft}
                label="Outline"
                active={view.outline}
                onClick={() => onView({ outline: !view.outline })}
              />
              <WideTool
                icon={PanelRight}
                label="Insights"
                active={view.insights}
                onClick={() => onView({ insights: !view.insights })}
              />
              <WideTool
                icon={RulerIcon}
                label="Ruler"
                active={view.ruler}
                onClick={() => onView({ ruler: !view.ruler })}
              />
            </Group>

            <GroupDivider />

            <Group label="Zoom">
              <Tool
                icon={ZoomOut}
                label="Zoom out"
                disabled={view.zoom <= ZOOMS[0]}
                onClick={() =>
                  onView({ zoom: ZOOMS[Math.max(0, ZOOMS.indexOf(view.zoom) - 1)] ?? 1 })
                }
              />
              <Dropdown
                title="Zoom"
                onRefocus={refocus}
                width={84}
                value={String(view.zoom)}
                onValue={(value) => onView({ zoom: Number(value) })}
                options={ZOOMS.map((value) => ({
                  value: String(value),
                  label: `${Math.round(value * 100)}%`,
                }))}
              />
              <Tool
                icon={ZoomIn}
                label="Zoom in"
                disabled={view.zoom >= ZOOMS[ZOOMS.length - 1]}
                onClick={() =>
                  onView({
                    zoom: ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(view.zoom) + 1)] ?? 1,
                  })
                }
              />
            </Group>

            <GroupDivider />

            <Group label="Focus">
              <WideTool
                icon={Maximize2}
                label={view.focus ? "Leave focus mode" : "Focus mode"}
                active={view.focus}
                onClick={() => onView({ focus: !view.focus })}
              />
            </Group>
          </>
        )}
      </div>
    </div>
  );
}
