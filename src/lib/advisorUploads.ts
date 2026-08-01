import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/components/advisor/AttachmentChips";

const MAX_BYTES = 20 * 1024 * 1024;

function kindFor(mime: string): Attachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("word")) return "doc";
  if (mime.includes("sheet") || mime === "text/csv" || mime.includes("excel")) return "sheet";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export async function ingestFile(file: File, userId: string): Promise<Attachment> {
  if (file.size > MAX_BYTES) {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      mime: file.type,
      kind: kindFor(file.type),
      status: "error",
      error: "File exceeds 20 MB",
    };
  }

  const id = crypto.randomUUID();
  const kind = kindFor(file.type);
  const path = `${userId}/${id}/${file.name}`;

  // Upload to private bucket
  const { error: upErr } = await supabase.storage.from("advisor-uploads").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) {
    return {
      id, name: file.name, size: file.size, mime: file.type, kind,
      status: "error", error: upErr.message,
    };
  }

  let dataUrl: string | undefined;
  let summary = "";
  let extractedText = "";

  if (kind === "image") {
    dataUrl = await readAsDataUrl(file);
    summary = `Image attached: ${file.name}`;
  } else if (kind === "text") {
    try {
      extractedText = (await readAsText(file)).slice(0, 30000);
      summary = `Text file attached: ${file.name} (${extractedText.length} chars).`;
    } catch {
      summary = `File attached: ${file.name}`;
    }
  } else {
    // Ask edge function to parse PDF/DOC/SHEET/AUDIO and summarize
    try {
      const dataUrlForUpload = await readAsDataUrl(file);
      const { data, error } = await supabase.functions.invoke("advisor-ingest-file", {
        body: { name: file.name, mime: file.type, dataUrl: dataUrlForUpload, storagePath: path },
      });
      if (!error && data) {
        summary = data.summary || `File attached: ${file.name}`;
        extractedText = (data.extractedText || "").slice(0, 30000);
      } else {
        summary = `File attached: ${file.name} (could not extract content).`;
      }
    } catch {
      summary = `File attached: ${file.name}`;
    }
  }

  return {
    id, name: file.name, size: file.size, mime: file.type, kind,
    status: "ready", storagePath: path, summary, extractedText, dataUrl,
  };
}
