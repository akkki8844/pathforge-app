/**
 * Extract text from a LinkedIn "Save to PDF" export.
 *
 * This was previously inlined in ImportLinkedInModal, while LinkedInAnalysis
 * did something entirely different and wrong:
 *
 *     const text = await file.text();     // <- a PDF is not a text file
 *
 * `File.text()` decodes the raw bytes as UTF-8, so what got sent to the
 * analyzer was the PDF container itself — "%PDF-1.7", object tables and
 * FlateDecode-compressed binary streams — not a single readable word of the
 * user's profile. One shared, correct implementation now.
 *
 * Two further failure modes are handled here, because both of them made the
 * import look broken on every surface that uses it:
 *
 * 1. pdf.js needs side-car resources for anything but the simplest PDF —
 *    `cMapUrl` for CID/multi-byte fonts, `standardFontDataUrl` for the 14
 *    non-embedded base fonts, `wasmUrl` for its image codecs. Left unset,
 *    pdf.js resolves them relative to its own bundled chunk URL, i.e.
 *    `/assets/cmaps/…`, which 404s in a Vite build — and a LinkedIn export
 *    with a non-Latin name or a non-embedded font then throws instead of
 *    returning text. They are served from `public/pdfjs/` so the paths are
 *    stable in dev and production alike.
 *
 * 2. The worker is a real ES module worker. On browsers that refuse it (older
 *    Safari, hardened privacy modes, some in-app webviews) the very first
 *    `getDocument()` rejects and there is nothing the caller can do about it.
 *    We retry once on the main thread with the fake worker, which is slower
 *    but always available.
 */

const PDFJS_RESOURCES = {
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  // Never eval, and never let pdf.js reach for system fonts — text extraction
  // does not need either and both are blocked under a strict CSP.
  isEvalSupported: false,
  useSystemFonts: false,
} as const;

type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
      (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
        workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

async function extract(pdfjs: PdfjsModule, data: ArrayBuffer, disableWorker: boolean): Promise<string> {
  const globalWorkerOptions = (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
    .GlobalWorkerOptions;
  const workerSrc = globalWorkerOptions.workerSrc;
  // Blanking `workerSrc` is what makes pdf.js fall back to its in-process
  // "fake worker" — there is no public flag for it.
  if (disableWorker) globalWorkerOptions.workerSrc = "";

  try {
    const doc = await pdfjs.getDocument({
      // pdf.js transfers (and then detaches) the buffer it is handed, so each
      // attempt needs its own copy or the retry below gets an empty buffer.
      data: data.slice(0),
      ...PDFJS_RESOURCES,
    } as Parameters<typeof pdfjs.getDocument>[0]).promise;
    return await readAllPages(doc);
  } finally {
    globalWorkerOptions.workerSrc = workerSrc;
  }
}

type PdfDocument = Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>;

async function readAllPages(doc: PdfDocument): Promise<string> {


  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out +=
        content.items
          .map((it) => (typeof (it as { str?: unknown }).str === "string" ? (it as { str: string }).str : ""))
          .join(" ") + "\n\n";
    } catch (err) {
      // One unreadable page must not lose the other nine.
      console.warn(`parseLinkedInPdf: page ${i} failed`, err);
    }
  }
  await doc.destroy().catch(() => undefined);
  return out.trim();
}

export async function parseLinkedInPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();

  try {
    const text = await extract(pdfjs, buf, false);
    if (text) return text;
  } catch (err) {
    console.warn("parseLinkedInPdf: worker extraction failed, retrying on main thread", err);
  }

  // Either the worker never started, or it produced nothing at all.
  return extract(pdfjs, buf, true);
}

/** Shared client-side guardrails so we fail fast with a useful message. */
export const LINKEDIN_PDF_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The analyze-linkedin edge function hard-rejects anything over 50k chars.
 * Truncating here (rather than being rejected server-side after the upload)
 * keeps long profiles working instead of erroring out.
 */
export const LINKEDIN_TEXT_MAX_CHARS = 50_000;

export function validateLinkedInPdf(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Please upload a PDF (LinkedIn → More → Save to PDF).";
  }
  if (file.size > LINKEDIN_PDF_MAX_BYTES) return "Max file size is 10MB.";
  return null;
}
