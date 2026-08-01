// Generate a DOCX from markdown using the `docx` library.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "https://esm.sh/docx@8.5.0";

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

function mdToParagraphs(md: string, title: string): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, bold: true })] }),
    new Paragraph({ children: [new TextRun("")] }),
  ];
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) { out.push(new Paragraph({ children: [new TextRun("")] })); continue; }
    if (/^#\s+/.test(line)) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(line.replace(/^#\s+/, ""))] }));
    else if (/^##\s+/.test(line)) out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line.replace(/^##\s+/, ""))] }));
    else if (/^###\s+/.test(line)) out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(line.replace(/^###\s+/, ""))] }));
    else if (/^[-*]\s+/.test(line)) out.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(line.replace(/^[-*]\s+/, ""))] }));
    else {
      const stripped = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");
      out.push(new Paragraph({ children: [new TextRun(stripped)] }));
    }
  }
  return out;
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

    const doc = new Document({
      sections: [{ properties: {}, children: mdToParagraphs(String(markdown).slice(0, 60000), String(title).slice(0, 120)) }],
    });
    const buf = await Packer.toBuffer(doc);
    const bytes = new Uint8Array(buf);

    const path = `${auth.userId}/${crypto.randomUUID()}/${title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "document"}.docx`;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth.authHeader } } },
    );
    const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const { error: upErr } = await supabase.storage.from("advisor-artifacts").upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabase.from("advisor_artifacts").insert({
      user_id: auth.userId, conversation_id: conversationId || null,
      kind: "document", title, file_path: path, file_mime: mime,
    }).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ artifact: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-artifact-docx error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
