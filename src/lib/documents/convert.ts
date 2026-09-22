/**
 * Getting text in and out of the editor.
 *
 * The editor stores HTML, because that is what a rich document is: bold runs,
 * tables, alignment and colour have no markdown spelling. Documents written
 * before it did store markdown, so anything that does not look like HTML is
 * converted on open — once, silently, and saved back as HTML by the first
 * autosave.
 *
 * Export goes the other way. A student who writes here should be able to take
 * the document with them: a standalone HTML file that opens anywhere and keeps
 * its layout, GitHub-flavoured markdown for anything that reads markdown, or
 * plain text. Printing is the browser's, through the `@page` rule in
 * `./page.ts`, which is also how a PDF is made.
 */

import { marked } from "marked";
import TurndownService from "turndown";
import type { PageSetup } from "./page";
import { pageBox } from "./page";

/**
 * Does this body already hold HTML?
 *
 * A markdown document can contain an inline tag, so the test is whether the
 * body *starts* as markup — which is what the editor always writes — rather
 * than whether a tag appears anywhere in it.
 */
export function looksLikeHtml(body: string): boolean {
  return /^\s*<(?:[a-z][a-z0-9]*)\b[^>]*>/i.test(body);
}

/** Legacy markdown bodies, brought forward. */
export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: false });
  return typeof html === "string" ? html : "";
}

/** The body as the editor should open it, whichever way it was stored. */
export function toEditorHtml(body: string | null): string {
  const text = (body ?? "").trim();
  if (!text) return "";
  return looksLikeHtml(text) ? text : markdownToHtml(text);
}

let turndown: TurndownService | null = null;

function turndownService(): TurndownService {
  if (turndown) return turndown;
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  service.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement: (content) => `~~${content}~~`,
  });

  // The checkbox is the task item's control, not its text.
  service.addRule("checkbox", {
    filter: (node) =>
      node.nodeName === "INPUT" && (node as HTMLInputElement).type === "checkbox",
    replacement: () => "",
  });

  service.addRule("taskItem", {
    filter: (node) =>
      node.nodeName === "LI" && (node as HTMLElement).getAttribute("data-checked") !== null,
    replacement: (content, node) => {
      const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
      const text = content.replace(/^\s+/, "").replace(/\n+$/, "");
      return `- [${checked ? "x" : " "}] ${text}\n`;
    },
  });

  // Markdown has neither underline nor highlight. Underline is written as the
  // HTML tag, which every renderer passes through — turndown would otherwise
  // drop the tag and the underline with it. Highlight takes the `==`
  // convention that the editors which have one all use.
  service.addRule("underline", {
    filter: ["u", "ins"],
    replacement: (content) => (content ? `<u>${content}</u>` : ""),
  });

  service.addRule("highlight", {
    filter: ["mark"],
    replacement: (content) => `==${content}==`,
  });

  service.addRule("table", {
    filter: "table",
    replacement: (_content, node) => {
      const rows = Array.from((node as HTMLTableElement).rows ?? []);
      if (!rows.length) return "";
      const readRow = (row: HTMLTableRowElement) =>
        Array.from(row.cells).map((cell) =>
          (cell.textContent ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim(),
        );
      const head = readRow(rows[0]);
      const body = rows.slice(1).map(readRow);
      const line = (values: string[]) => `| ${values.join(" | ")} |`;
      return `\n\n${[line(head), line(head.map(() => "---")), ...body.map(line)].join("\n")}\n\n`;
    },
  });



  turndown = service;
  return service;
}

export function htmlToMarkdown(html: string): string {
  // A page break is an empty div, and turndown throws every empty element away
  // before any rule can claim it. Markdown's nearest thing to a page break is
  // a thematic break, so it becomes one on the way out.
  const prepared = html.replace(/<div[^>]*\bdata-page-break\b[^>]*>\s*<\/div>/gi, "<hr>");
  return turndownService().turndown(prepared).replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/**
 * The document as text, with one blank line between blocks.
 *
 * Each block contributes only the text that is its own. A list item that holds
 * another list would otherwise be read twice — once as itself, and once inside
 * its parent, which ran "one" and "nested" together into "onenested". Table
 * rows come out as rows, cells separated by tabs, which is what a spreadsheet
 * and a terminal both expect.
 */
const TEXT_BLOCK = /^(P|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE|PRE)$/;
const TEXT_CONTAINER = /^(P|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE|PRE|UL|OL|TABLE|THEAD|TBODY|TR|TD|TH|DIV)$/;

export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  const blocks: string[] = [];

  /** The text belonging to this element and not to a block inside it. */
  const own = (element: Element): string => {
    let text = "";
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? "";
      else if (node.nodeType === Node.ELEMENT_NODE) {
        if (TEXT_CONTAINER.test((node as Element).tagName)) continue;
        text += node.textContent ?? "";
      }
    }
    return text.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  };

  const walk = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (child.tagName === "TR") {
        const cells = Array.from(child.children).map((cell) =>
          (cell.textContent ?? "").replace(/\s+/g, " ").trim(),
        );
        if (cells.some(Boolean)) blocks.push(cells.join("\t"));
        continue;
      }
      if (TEXT_BLOCK.test(child.tagName)) {
        const text = own(child);
        if (text) blocks.push(text);
      }
      walk(child);
    }
  };

  walk(doc.body);
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/**
 * A standalone HTML file: the document, its styles and its page size, with
 * nothing to fetch. It opens the same on a machine that has never heard of
 * Pathforge, and prints to the same paper.
 */
export function standaloneHtml(title: string, html: string, setup: PageSetup): string {
  const box = pageBox(setup);
  const escaped = title.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped}</title>
<style>
  @page { size: ${box.width > box.height ? "landscape" : "portrait"}; margin: ${box.padY / 96}in ${box.padX / 96}in; }
  body { margin: 0; background: #f3f3f1; }
  .sheet {
    box-sizing: border-box;
    width: ${box.width}px;
    min-height: ${box.height}px;
    margin: 24px auto;
    padding: ${box.padY}px ${box.padX}px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08);
    font-family: ${setup.fontFamily};
    font-size: ${setup.fontSize}pt;
    line-height: ${setup.lineHeight};
    color: #111;
  }
  .sheet > * { margin: 0 0 ${setup.paragraphSpacing}px; }
  h1, h2, h3, h4 { line-height: 1.25; margin-top: 1.2em; }
  h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
  blockquote { border-left: 3px solid #d4d4d8; margin-left: 0; padding-left: 16px; color: #3f3f46; }
  pre { background: #f4f4f5; padding: 12px 14px; border-radius: 6px; overflow-x: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .92em; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; }
  img { max-width: 100%; height: auto; }
  hr { border: 0; border-top: 1px solid #d4d4d8; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
  [data-page-break] { break-after: page; height: 0; border-top: 1px dashed #d4d4d8; }
  @media print {
    body { background: #fff; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  }
</style>
</head>
<body><article class="sheet">${html}</article></body>
</html>`;
}

/**
 * The same document, as a file Word opens.
 *
 * Not a .docx — that is a zip of XML parts and would need a library to build.
 * This is the other thing Word has always opened: an HTML document declared as
 * a Word document, with the page set up in an `@page` rule and the Office
 * namespaces it looks for. Word reads it, keeps the formatting and the paper
 * size, and saves it on as .docx from there if the student wants.
 */
export function wordHtml(title: string, html: string, setup: PageSetup): string {
  const box = pageBox(setup);
  const escaped = title.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escaped}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: ${box.width}px ${box.height}px; margin: ${box.padY / 96}in ${box.padX / 96}in; }
  body {
    font-family: ${setup.fontFamily};
    font-size: ${setup.fontSize}pt;
    line-height: ${setup.lineHeight};
    color: #111;
  }
  body > * { margin: 0 0 ${setup.paragraphSpacing}px; }
  h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
  blockquote { border-left: 3px solid #d4d4d8; margin-left: 0; padding-left: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; }
  pre { background: #f4f4f5; padding: 12px 14px; }
  img { max-width: 100%; height: auto; }
  [data-page-break] { page-break-after: always; height: 0; }
</style>
</head>
<body>${html}</body>
</html>`;
}

/** Hand a file to the browser. Same shape for every export. */
export function download(filename: string, mime: string, contents: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick: Safari has not started the download yet when
  // click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A filename that will survive every filesystem the student might use. */
export function safeFilename(title: string, extension: string): string {
  const base = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${base || "Untitled document"}.${extension}`;
}
