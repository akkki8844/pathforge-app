// Generate a PPTX from a structured outline using pptxgenjs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { title, slides, conversationId } = await req.json();
    if (!title || !Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "title and slides required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = String(title).slice(0, 120);

    // Title slide
    const cover = pptx.addSlide();
    cover.background = { color: "0F172A" };
    cover.addText(String(title).slice(0, 120), {
      x: 0.5, y: 2.2, w: 12.3, h: 1.5, fontSize: 44, bold: true, color: "FFFFFF", fontFace: "Calibri",
    });
    cover.addText("Pathforge Advisor", {
      x: 0.5, y: 3.8, w: 12.3, h: 0.4, fontSize: 16, color: "94A3B8", fontFace: "Calibri",
    });

    for (const s of slides.slice(0, 30)) {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addText(String(s.heading || "Untitled").slice(0, 120), {
        x: 0.5, y: 0.4, w: 12.3, h: 0.9, fontSize: 30, bold: true, color: "0F172A", fontFace: "Calibri",
      });
      const bullets: string[] = Array.isArray(s.bullets) ? s.bullets.slice(0, 8) : [];
      if (bullets.length) {
        slide.addText(bullets.map((b: string) => ({ text: String(b).slice(0, 240), options: { bullet: true } })) as any, {
          x: 0.6, y: 1.5, w: 12.0, h: 5.5, fontSize: 20, color: "1E293B", fontFace: "Calibri", lineSpacingMultiple: 1.2,
        });
      }
      if (s.notes) slide.addNotes(String(s.notes).slice(0, 2000));
    }

    const blob = await (pptx as any).write({ outputType: "uint8array" });
    const bytes: Uint8Array = blob instanceof Uint8Array ? blob : new Uint8Array(blob);

    const path = `${auth.userId}/${crypto.randomUUID()}/${title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "deck"}.pptx`;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth.authHeader } } },
    );
    const mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const { error: upErr } = await supabase.storage.from("advisor-artifacts").upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabase.from("advisor_artifacts").insert({
      user_id: auth.userId, conversation_id: conversationId || null,
      kind: "slides", title, content_json: { slides },
      file_path: path, file_mime: mime,
    }).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ artifact: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-artifact-pptx error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
