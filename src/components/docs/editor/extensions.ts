/**
 * The editor's schema.
 *
 * TipTap ships most of a word processor as separate extensions; what is here
 * is the handful it does not, and the one place they are assembled. Each of
 * the four local extensions exists because a document needs it and the library
 * leaves it to the application:
 *
 * • `FontSize` — a size on a run of text. TipTap has families and colours but
 *   not sizes, because a size is only meaningful in the unit the document is
 *   measured in. Points, here, the same as the page.
 * • `BlockLayout` — line spacing and indentation on a block, plus the Tab and
 *   Shift+Tab bindings that make Tab indent a paragraph the way it does in a
 *   word processor rather than move focus out of the document.
 * • `PageBreak` — an explicit break. It draws a line on screen and breaks the
 *   paper when printed, which is the whole of what a page break is.
 * • `TextCase` — Word's Change Case, including the Shift+F3 cycle.
 * • `WordKeys` — the shortcuts a word processor is expected to answer to and
 *   the web does not already bind. Anything Chrome reserves (Ctrl+L, Ctrl+E,
 *   Ctrl+R, Ctrl+J, Ctrl+Shift+N) is deliberately absent: a shortcut the
 *   browser eats first is worse than no shortcut, because the student has been
 *   told it works.
 * • `SearchReplace` — in `./search-replace.ts`, `ColumnResize` — in
 *   `./table-resize.ts`.
 */

import { Extension, Node, mergeAttributes, type CommandProps, type Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import { SearchReplace } from "./search-replace";
import { ColumnResize } from "./table-resize";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pfDocument: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
      setLineHeight: (value: number | null) => ReturnType;
      setBlockIndent: (indent: number) => ReturnType;
      setFirstLineIndent: (indent: number) => ReturnType;
      indentBlock: () => ReturnType;
      outdentBlock: () => ReturnType;
      insertPageBreak: () => ReturnType;
      setTextCase: (mode: TextCase) => ReturnType;
      cycleTextCase: () => ReturnType;
      stepFontSize: (direction: 1 | -1) => ReturnType;
    };
  }
}

/** Blocks that carry their own spacing and indent. */
const LAYOUT_TYPES = ["paragraph", "heading", "blockquote"];

/** One press of Tab, in px. Word's default tab stop is half an inch. */
export const INDENT_STEP = 48;
/** As far as a block may be pushed in, in px: five tab stops. */
const MAX_INDENT = INDENT_STEP * 5;

/** A CSS length in px, as a number. Anything else reads as none. */
function px(value: string | null | undefined): number {
  const parsed = parseFloat(value || "0");
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const BlockLayout = Extension.create({
  name: "blockLayout",

  addGlobalAttributes() {
    return [
      {
        types: LAYOUT_TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
          /** Left indent, in CSS px, so the ruler can set any stop it draws. */
          indent: {
            default: 0,
            parseHTML: (element) => px(element.style.marginLeft),
            renderHTML: (attributes) =>
              attributes.indent ? { style: `margin-left: ${attributes.indent}px` } : {},
          },
          /** First-line indent, in CSS px. Word's top ruler marker. */
          firstLine: {
            default: 0,
            parseHTML: (element) => px(element.style.textIndent),
            renderHTML: (attributes) =>
              attributes.firstLine ? { style: `text-indent: ${attributes.firstLine}px` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (value) =>
        ({ editor, commands }) =>
          LAYOUT_TYPES.filter((type) => editor.isActive(type))
            .map((type) => commands.updateAttributes(type, { lineHeight: value }))
            .some(Boolean),

      indentBlock:
        () =>
        ({ editor, commands }) =>
          shiftIndent(editor, commands, 1),

      outdentBlock:
        () =>
        ({ editor, commands }) =>
          shiftIndent(editor, commands, -1),

      setBlockIndent:
        (indent) =>
        ({ editor, commands }) =>
          LAYOUT_TYPES.filter((type) => editor.isActive(type))
            .map((type) =>
              commands.updateAttributes(type, {
                indent: Math.max(0, Math.min(MAX_INDENT, Math.round(indent))),
              }),
            )
            .some(Boolean),

      setFirstLineIndent:
        (indent) =>
        ({ editor, commands }) =>
          LAYOUT_TYPES.filter((type) => editor.isActive(type))
            .map((type) =>
              commands.updateAttributes(type, {
                firstLine: Math.max(-MAX_INDENT, Math.min(MAX_INDENT, Math.round(indent))),
              }),
            )
            .some(Boolean),
    };
  },

  addKeyboardShortcuts() {
    /*
     * Tab belongs to whichever structure the caret is in. A list sinks, a
     * table moves to the next cell, a code block types a tab — all of those
     * are other extensions' bindings, and returning false here lets them run.
     * Only in ordinary prose does Tab indent the paragraph.
     */
    const deferred = () =>
      this.editor.isActive("listItem") ||
      this.editor.isActive("taskItem") ||
      this.editor.isActive("table") ||
      this.editor.isActive("codeBlock");

    return {
      Tab: () => (deferred() ? false : this.editor.commands.indentBlock()),
      "Shift-Tab": () => (deferred() ? false : this.editor.commands.outdentBlock()),
    };
  },
});

/**
 * Move the block under the caret one tab stop, and report that the key was
 * used either way.
 *
 * "Either way" matters: at the first or last stop there is nothing to change,
 * but Tab must still be swallowed, or the browser takes it and moves focus out
 * of the document mid-sentence.
 */
function shiftIndent(
  editor: Editor,
  commands: CommandProps["commands"],
  direction: 1 | -1,
): boolean {
  for (const type of LAYOUT_TYPES) {
    if (!editor.isActive(type)) continue;
    const current = Number(editor.getAttributes(type).indent ?? 0) || 0;
    const next = Math.max(0, Math.min(MAX_INDENT, current + direction * INDENT_STEP));
    return next === current ? true : commands.updateAttributes(type, { indent: next });
  }
  return false;
}

/* ── Change case ────────────────────────────────────────────────────── */

export type TextCase = "sentence" | "lower" | "upper" | "title" | "toggle";

/** Word's cycle on Shift+F3, in Word's order. */
const CASE_CYCLE: TextCase[] = ["sentence", "upper", "lower"];

function recase(text: string, mode: TextCase): string {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(
        /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu,
        (word) => word[0].toUpperCase() + word.slice(1).toLowerCase(),
      );
    case "toggle":
      return text.replace(/\p{L}/gu, (letter) =>
        letter === letter.toLowerCase() ? letter.toUpperCase() : letter.toLowerCase(),
      );
    default: {
      const lower = text.toLowerCase();
      // The first letter of the selection, and of every sentence after a stop.
      return lower.replace(
        /(^\s*|[.!?]["’”\)]?\s+)(\p{L})/gu,
        (_match, lead: string, letter: string) => lead + letter.toUpperCase(),
      );
    }
  }
}

/**
 * Change the case of the selection without changing anything else about it.
 *
 * The selection is rewritten text node by text node, each carrying its own
 * marks forward, rather than as one string: replacing the whole range in one
 * go would give every word the formatting of the last one, so "the **quick**
 * brown" would come back bold throughout.
 *
 * Sentence and title case still need the whole string — where a sentence
 * begins is not a property of one node — so the text is joined, transformed,
 * and cut back up along the same boundaries.
 */
export const TextCase = Extension.create({
  name: "textCase",

  addStorage() {
    return { cycle: 0 };
  },

  addCommands() {
    return {
      setTextCase:
        (mode) =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection;
          if (from === to) return false;

          const runs: { from: number; to: number; text: string; marks: readonly unknown[] }[] = [];
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isText || !node.text) return true;
            const start = Math.max(from, pos);
            const end = Math.min(to, pos + node.nodeSize);
            if (start >= end) return false;
            runs.push({
              from: start,
              to: end,
              text: node.text.slice(start - pos, end - pos),
              marks: node.marks,
            });
            return false;
          });
          if (!runs.length) return false;

          const changed = recase(runs.map((run) => run.text).join(""), mode);
          if (changed === runs.map((run) => run.text).join("")) return false;

          if (dispatch) {
            let at = 0;
            const slices = runs.map((run) => {
              const text = changed.slice(at, at + run.text.length);
              at += run.text.length;
              return { ...run, text };
            });
            // Back to front: an earlier replacement would move every position
            // after it, and these were resolved against the document as it is.
            for (let i = slices.length - 1; i >= 0; i -= 1) {
              const run = slices[i];
              tr.replaceWith(
                run.from,
                run.to,
                state.schema.text(run.text, run.marks as never),
              );
            }
            tr.setSelection(TextSelection.create(tr.doc, from, to));
          }
          return true;
        },

      cycleTextCase:
        () =>
        ({ editor, commands }) => {
          const at = Number(editor.storage.textCase.cycle ?? 0) % CASE_CYCLE.length;
          editor.storage.textCase.cycle = at + 1;
          return commands.setTextCase(CASE_CYCLE[at]);
        },
    };
  },

  addKeyboardShortcuts() {
    return { "Shift-F3": () => this.editor.commands.cycleTextCase() };
  },
});

/* ── Type size ──────────────────────────────────────────────────────── */

/** The sizes the ribbon offers, in points; also the steps Ctrl+] walks. */
export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

/**
 * The shortcuts a word processor answers to, minus the ones the browser keeps.
 *
 * Ctrl+] and Ctrl+Shift+> step the type size, Ctrl+Enter breaks the page,
 * Ctrl+Alt+1..4 set headings and Ctrl+Alt+0 goes back to body text, and
 * Ctrl+Space strips character formatting — all as in Word.
 */
export const WordKeys = Extension.create({
  name: "wordKeys",

  addCommands() {
    return {
      stepFontSize:
        (direction) =>
        ({ editor, commands, view }) => {
          const attribute = String(editor.getAttributes("textStyle").fontSize ?? "");
          const parsed = parseFloat(attribute);
          // No size on the run means the size is the page's, which is set in
          // points on the sheet — so it is read back from there rather than
          // guessed.
          const current = Number.isFinite(parsed)
            ? parsed
            : Math.round(parseFloat(window.getComputedStyle(view.dom).fontSize) * 0.75);
          const next =
            direction > 0
              ? FONT_SIZES.find((size) => size > current)
              : [...FONT_SIZES].reverse().find((size) => size < current);
          if (!next) return false;
          return commands.setFontSize(`${next}pt`);
        },
    };
  },

  addKeyboardShortcuts() {
    const heading = (level: 1 | 2 | 3 | 4) => () =>
      this.editor.chain().focus().setHeading({ level }).run();

    return {
      "Mod-Enter": () => this.editor.commands.insertPageBreak(),
      "Mod-]": () => this.editor.commands.stepFontSize(1),
      "Mod-[": () => this.editor.commands.stepFontSize(-1),
      "Mod-Shift-.": () => this.editor.commands.stepFontSize(1),
      "Mod-Shift-,": () => this.editor.commands.stepFontSize(-1),
      "Mod-Alt-0": () => this.editor.chain().focus().setParagraph().run(),
      "Mod-Alt-1": heading(1),
      "Mod-Alt-2": heading(2),
      "Mod-Alt-3": heading(3),
      "Mod-Alt-4": heading(4),
      "Mod-Space": () => this.editor.commands.unsetAllMarks(),
    };
  },
});

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-page-break": "", class: "pf-page-break" }),
    ];
  },

  addCommands() {
    return {
      /**
       * Break the page, and put the caret on the new one.
       *
       * Inserting an atom leaves it selected, and typing over a selection
       * replaces it — so a student who pressed Ctrl+Enter and then carried on
       * writing deleted the break with the first letter. Word puts the caret
       * at the top of the next page, which is also the only reason to press it.
       */
      insertPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .command(({ tr, dispatch }) => {
              if (!dispatch) return true;
              const at = tr.selection.to;
              // A break at the end of the document has nothing to land in.
              if (at >= tr.doc.content.size) {
                const paragraph = tr.doc.type.schema.nodes.paragraph?.createAndFill();
                if (paragraph) tr.insert(at, paragraph);
              }
              const landing = Math.min(at + 1, tr.doc.content.size);
              tr.setSelection(TextSelection.near(tr.doc.resolve(landing), 1));
              return true;
            })
            .run(),
    };
  },
});

/** Everything the document editor understands, in one list. */
export function documentExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      codeBlock: { HTMLAttributes: { class: "pf-code-block" } },
      horizontalRule: { HTMLAttributes: { class: "pf-rule" } },
      // The editor keeps a deep history: a long essay is exactly where an
      // undo stack that forgets is most keenly felt.
      history: { depth: 200, newGroupDelay: 400 },
    }),
    Underline,
    Subscript,
    Superscript,
    TextStyle,
    Color,
    FontFamily.configure({ types: ["textStyle"] }),
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    BlockLayout,
    PageBreak,
    TextCase,
    WordKeys,
    // Word's AutoCorrect, near enough: straight quotes curl, "--" becomes an
    // em dash, "..." an ellipsis, "1/2" a fraction. A document should look
    // typeset without the student knowing where ’ lives on the keyboard.
    Typography,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    }),
    Image.configure({ allowBase64: true, inline: false, HTMLAttributes: { class: "pf-image" } }),
    Table.configure({ resizable: true, lastColumnResizable: true, cellMinWidth: 44 }),
    ColumnResize,
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder, showOnlyWhenEditable: true }),
    CharacterCount,
    SearchReplace,
  ];
}
