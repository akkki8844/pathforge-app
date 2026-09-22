/**
 * Find and replace.
 *
 * Matching is done over the document's text as one string, with an index back
 * to document positions, rather than node by node. A search that only looked
 * inside each text node would fail on "the **quick** brown" — the bold run
 * splits the sentence into three nodes, and the reader sees one sentence.
 * Positions that fall on a block boundary are recorded as -1, so a match is
 * rejected if it would span two paragraphs.
 *
 * The hits are decorations, not marks: they are a view of the document, they
 * must not enter the undo history, and they must not be saved. Every hit is
 * tinted, the current one more strongly, the way every editor does it.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchOptions {
  term: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
}

interface SearchPluginState extends SearchOptions {
  matches: SearchMatch[];
  /** Index of the highlighted match, or -1 when there are none. */
  index: number;
  decorations: DecorationSet;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pfSearch: {
      setSearch: (options: Partial<SearchOptions>) => ReturnType;
      goToMatch: (delta: number) => ReturnType;
      replaceCurrent: () => ReturnType;
      replaceAll: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const searchKey = new PluginKey<SearchPluginState>("pfSearch");

/** The document's text, with the position of every character beside it. */
function indexText(doc: ProseMirrorNode): { text: string; positions: number[] } {
  let text = "";
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.isText) {
      const value = node.text ?? "";
      for (let i = 0; i < value.length; i += 1) {
        text += value[i];
        positions.push(pos + i);
      }
      return false;
    }
    if (node.isBlock && text.length > 0 && text[text.length - 1] !== "\n") {
      text += "\n";
      positions.push(-1);
    }
    return true;
  });
  return { text, positions };
}

function findMatches(doc: ProseMirrorNode, options: SearchOptions): SearchMatch[] {
  if (!options.term) return [];
  const { text, positions } = indexText(doc);
  const escaped = options.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = options.wholeWord
    ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
    : escaped;

  let expression: RegExp;
  try {
    expression = new RegExp(pattern, options.caseSensitive ? "gu" : "giu");
  } catch {
    return [];
  }

  const matches: SearchMatch[] = [];
  for (const found of text.matchAll(expression)) {
    const start = found.index ?? 0;
    const end = start + found[0].length;
    if (!found[0].length) continue;
    let crossesBlock = false;
    for (let i = start; i < end; i += 1) {
      if (positions[i] < 0) {
        crossesBlock = true;
        break;
      }
    }
    if (crossesBlock) continue;
    matches.push({ from: positions[start], to: positions[end - 1] + 1 });
  }
  return matches;
}

function decorate(doc: ProseMirrorNode, matches: SearchMatch[], index: number): DecorationSet {
  if (!matches.length) return DecorationSet.empty;
  return DecorationSet.create(
    doc,
    matches.map((match, i) =>
      Decoration.inline(match.from, match.to, {
        class: i === index ? "pf-find pf-find-active" : "pf-find",
      }),
    ),
  );
}

const EMPTY: SearchPluginState = {
  term: "",
  replacement: "",
  caseSensitive: false,
  wholeWord: false,
  matches: [],
  index: -1,
  decorations: DecorationSet.empty,
};

function currentMatch(state: EditorState): SearchMatch | null {
  const search = searchKey.getState(state);
  if (!search || search.index < 0) return null;
  return search.matches[search.index] ?? null;
}

export const SearchReplace = Extension.create({
  name: "searchReplace",

  addStorage() {
    return { term: "", total: 0, index: -1 };
  },

  onTransaction() {
    const state = searchKey.getState(this.editor.state);
    this.storage.term = state?.term ?? "";
    this.storage.total = state?.matches.length ?? 0;
    this.storage.index = state?.index ?? -1;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchKey,
        state: {
          init: () => EMPTY,
          apply(transaction, previous, _old, next) {
            const meta = transaction.getMeta(searchKey) as
              | (Partial<SearchOptions> & { index?: number })
              | undefined;
            if (!meta && !transaction.docChanged) return previous;

            const options: SearchOptions = {
              term: meta?.term ?? previous.term,
              replacement: meta?.replacement ?? previous.replacement,
              caseSensitive: meta?.caseSensitive ?? previous.caseSensitive,
              wholeWord: meta?.wholeWord ?? previous.wholeWord,
            };

            const changedSearch =
              options.term !== previous.term ||
              options.caseSensitive !== previous.caseSensitive ||
              options.wholeWord !== previous.wholeWord;

            const matches =
              changedSearch || transaction.docChanged
                ? findMatches(next.doc, options)
                : previous.matches;

            let index = meta?.index ?? (changedSearch ? 0 : previous.index);
            if (!matches.length) index = -1;
            else if (index < 0) index = 0;
            else index = ((index % matches.length) + matches.length) % matches.length;

            return { ...options, matches, index, decorations: decorate(next.doc, matches, index) };
          },
        },
        props: {
          decorations: (state) => searchKey.getState(state)?.decorations ?? DecorationSet.empty,
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearch:
        (options) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(searchKey, options);
          return true;
        },

      /**
       * Step through the hits, and bring the one we land on into view.
       *
       * The selection moves too, not just the scroll position: the student can
       * close the bar and type straight over the hit, which is what pressing
       * Enter in a find bar has always done.
       */
      goToMatch:
        (delta) =>
        ({ state, tr, dispatch }) => {
          const search = searchKey.getState(state);
          if (!search || !search.matches.length) return false;
          const count = search.matches.length;
          const index = (((search.index + delta) % count) + count) % count;
          const match = search.matches[index];
          if (dispatch && match) {
            tr.setMeta(searchKey, { index });
            tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
            tr.scrollIntoView();
          }
          return true;
        },

      replaceCurrent:
        () =>
        ({ state, tr, dispatch }) => {
          const match = currentMatch(state);
          if (!match) return false;
          if (dispatch) {
            const replacement = searchKey.getState(state)?.replacement ?? "";
            if (replacement) tr.insertText(replacement, match.from, match.to);
            else tr.delete(match.from, match.to);
          }
          return true;
        },

      replaceAll:
        () =>
        ({ state, tr, dispatch }) => {
          const search = searchKey.getState(state);
          if (!search || !search.matches.length) return false;
          if (dispatch) {
            // Back to front: replacing one hit shifts every position after it.
            for (let i = search.matches.length - 1; i >= 0; i -= 1) {
              const match = search.matches[i];
              if (search.replacement) tr.insertText(search.replacement, match.from, match.to);
              else tr.delete(match.from, match.to);
            }
          }
          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(searchKey, { term: "", index: -1 });
          return true;
        },
    };
  },
});
