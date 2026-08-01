// Generate a PDF from markdown using jsPDF; upload to advisor-artifacts; insert row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false } as const;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { authorized: false } as const;
  return { authorized: true, userId: user.id, authHeader } as const;
}

function renderPdf(title: string, markdown: string): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, margin, y);
  y += 28;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = markdown.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\r/g, "");
    let text = line;
    let size = 11;
    let bold = false;

    if (/^#\s+/.test(line)) { text = line.replace(/^#\s+/, ""); size = 18; bold = true; y += 6; }
    else if (/^##\s+/.test(line)) { text = line.replace(/^##\s+/, ""); size = 15; bold = true; y += 4; }
    else if (/^###\s+/.test(line)) { text = line.replace(/^###\s+/, ""); size = 13; bold = true; y += 2; }
    else if (/^[-*]\s+/.test(line)) { text = "•  " + line.replace(/^[-*]\s+/, ""); }
    else if (/^\d+\.\s+/.test(line)) { /* keep numbering */ }

    // Strip simple markdown emphasis
    text = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");

    if (!text.trim()) { y += size * 0.6; continue; }

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, maxW) as string[];
    for (const w of wrapped) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(w, margin, y);
      y += size * 1.35;
    }
    y += 2;
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { title, markdown, conversationId } = await req.json();
    if (!title || !markdown) {
      return new Response(JSON.stringify({ error: "title and markdown required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = renderPdf(String(title).slice(0, 120), String(markdown).slice(0, 60000));
    const path = `${auth.userId}/${crypto.randomUUID()}/${title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "document"}.pdf`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth.authHeader } } },
    );
    const { error: upErr } = await supabase.storage.from("advisor-artifacts").upload(path, bytes, {
      contentType: "application/pdf", upsert: false,
    });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabase.from("advisor_artifacts").insert({
      user_id: auth.userId, conversation_id: conversationId || null,
      kind: "pdf", title, file_path: path, file_mime: "application/pdf",
    }).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ artifact: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-artifact-pdf error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
