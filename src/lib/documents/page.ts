/**
 * Page setup: paper, orientation, margins, spacing.
 *
 * The editor is a paged editor, so these are real measurements rather than a
 * theme. Everything is held in CSS pixels at 96dpi, which is the unit the
 * browser prints in: A4 is 210 × 297mm, which is 8.27 × 11.69in, which is
 * 794 × 1123px. A page drawn at those numbers on screen and printed through
 * the matching `@page` rule comes out the same shape, so the page-break lines
 * the editor draws are where the paper will actually break.
 *
 * Setup is per document and lives in `localStorage`, not in the row. It is a
 * property of the document and it belongs in the database, but `documents` has
 * no column for it and inventing one here would put the live schema further
 * out of step with `supabase/migrations` than it already is. Kept local, the
 * worst case is that a document opens at A4 on a second machine; kept in a
 * column that only exists in production, the worst case is a migration that
 * cannot be replayed.
 */

export type PaperId = "a4" | "letter" | "legal";
export type MarginId = "normal" | "narrow" | "moderate" | "wide";

export interface Paper {
  label: string;
  /** Portrait dimensions in CSS px at 96dpi. */
  width: number;
  height: number;
  /** The `size` keyword for the `@page` rule. */
  css: string;
}

export const PAPERS: Record<PaperId, Paper> = {
  a4: { label: "A4", width: 794, height: 1123, css: "A4" },
  letter: { label: "Letter", width: 816, height: 1056, css: "Letter" },
  legal: { label: "Legal", width: 816, height: 1344, css: "Legal" },
};

export interface Margin {
  label: string;
  /** Left and right, then top and bottom, in CSS px. */
  x: number;
  y: number;
}

export const MARGINS: Record<MarginId, Margin> = {
  normal: { label: "Normal — 1\"", x: 96, y: 96 },
  narrow: { label: "Narrow — ½\"", x: 48, y: 48 },
  moderate: { label: "Moderate — ¾\"", x: 72, y: 96 },
  wide: { label: "Wide — 2\"", x: 192, y: 96 },
};

export interface PageSetup {
  paper: PaperId;
  landscape: boolean;
  margin: MarginId;
  /** Document-wide line height, as a multiple. Word's "Line spacing". */
  lineHeight: number;
  /** Space after a paragraph, in CSS px. Word's "Space after". */
  paragraphSpacing: number;
  /** Base type size for the body, in points. */
  fontSize: number;
  /** Base family for the body, as a CSS font stack. */
  fontFamily: string;
}

export const DEFAULT_SETUP: PageSetup = {
  paper: "a4",
  landscape: false,
  margin: "normal",
  lineHeight: 1.5,
  paragraphSpacing: 10,
  fontSize: 11,
  // Exactly one of the stacks the ribbon offers, so the Layout tab's font
  // dropdown shows the document's own face rather than an empty box.
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
};

export interface PageBox {
  /** Sheet size after orientation. */
  width: number;
  height: number;
  padX: number;
  padY: number;
  /** The text column, and the height one page of it can hold. */
  contentWidth: number;
  contentHeight: number;
}

export function pageBox(setup: PageSetup): PageBox {
  const paper = PAPERS[setup.paper] ?? PAPERS.a4;
  const margin = MARGINS[setup.margin] ?? MARGINS.normal;
  const width = setup.landscape ? paper.height : paper.width;
  const height = setup.landscape ? paper.width : paper.height;
  return {
    width,
    height,
    padX: margin.x,
    padY: margin.y,
    contentWidth: width - margin.x * 2,
    contentHeight: height - margin.y * 2,
  };
}

/** The `@page` rule that makes the printed sheet match the drawn one. */
export function printRule(setup: PageSetup): string {
  const paper = PAPERS[setup.paper] ?? PAPERS.a4;
  const margin = MARGINS[setup.margin] ?? MARGINS.normal;
  const orientation = setup.landscape ? "landscape" : "portrait";
  // Margins go to `@page`, so the browser owns them and the printed text
  // column is the same width as the drawn one.
  return `@page { size: ${paper.css} ${orientation}; margin: ${margin.y / 96}in ${margin.x / 96}in; }`;
}

const KEY = "pf.doc.setup.";

export function loadSetup(docId: string): PageSetup {
  try {
    const raw = window.localStorage.getItem(KEY + docId);
    if (!raw) return { ...DEFAULT_SETUP };
    const saved = JSON.parse(raw) as Partial<PageSetup>;
    return { ...DEFAULT_SETUP, ...saved };
  } catch {
    // Private windows and blocked site data both throw here. A document that
    // opens at the default setup is fine; one that fails to open is not.
    return { ...DEFAULT_SETUP };
  }
}

export function saveSetup(docId: string, setup: PageSetup): void {
  try {
    window.localStorage.setItem(KEY + docId, JSON.stringify(setup));
  } catch {
    /* Nothing to do: the setting is a convenience, not the document. */
  }
}
